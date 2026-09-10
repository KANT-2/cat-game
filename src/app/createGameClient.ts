import type { GameClient } from "../core/GameClient";
import { LocalGameClient } from "../core/LocalGameClient";
import { BackendApiClient, BackendApiError } from "../services/BackendApiClient";
import { BackendLearningGameClient } from "../services/BackendLearningGameClient";
import { GameStateStore } from "../services/gameStateStore";

export type AuthenticationMode = "login" | "register";

export type GameSession = {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  onExpired: (listener: () => void) => void;
};

export type ReadyGameClient = {
  client: GameClient;
  session: GameSession | null;
};

export type GameClientStart =
  | ({ kind: "ready" } & ReadyGameClient)
  | {
      kind: "authentication-required";
      authenticate: (mode: AuthenticationMode, email: string, password: string) => Promise<ReadyGameClient>;
    };

/** 환경 설정과 브라우저 세션에 따라 즉시 사용할 클라이언트 또는 로그인 명령을 준비한다. */
export async function createGameClient(): Promise<GameClientStart> {
  const local = new LocalGameClient(new GameStateStore());
  const baseUrl = import.meta.env.VITE_CAT_GAME_API_BASE_URL?.trim();
  if (!baseUrl) {
    return { kind: "ready", client: local, session: null };
  }
  const configuredUser = import.meta.env.VITE_CAT_GAME_USER_PUBLIC_ID?.trim() || null;
  const api = new BackendApiClient(baseUrl, configuredUser);
  if (configuredUser) {
    return { kind: "ready", client: await BackendLearningGameClient.create(local, api), session: null };
  }
  try {
    const user = await api.connectBrowserSession();
    return {
      kind: "ready",
      ...browserSession(await BackendLearningGameClient.createConnected(local, api, user), api),
    };
  } catch (error) {
    if (!(error instanceof BackendApiError) || error.status !== 401) {
      throw error;
    }
  }
  if (import.meta.env.DEV) {
    return { kind: "ready", client: await BackendLearningGameClient.create(local, api), session: null };
  }
  return {
    kind: "authentication-required",
    authenticate: async (mode, email, password) => {
      const user =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, deriveUsername(email), password);
      return browserSession(await BackendLearningGameClient.createConnected(local, api, user), api);
    },
  };
}

function browserSession(client: BackendLearningGameClient, api: BackendApiClient): ReadyGameClient {
  return {
    client,
    session: {
      refresh: async () => {
        await client.refreshFromServer();
      },
      logout: () => api.logout(),
      onExpired: (listener) => api.setAuthenticationExpiredListener(listener),
    },
  };
}

function deriveUsername(email: string): string {
  const localPart = email.split("@", 1)[0]?.trim();
  return (localPart ?? "").slice(0, 40);
}
