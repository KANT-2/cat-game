import type { GameClient } from "../core/GameClient";
import { LocalGameClient } from "../core/LocalGameClient";
import { BackendApiClient } from "../services/BackendApiClient";
import { BackendLearningGameClient } from "../services/BackendLearningGameClient";
import { GameStateStore } from "../services/gameStateStore";

/** 환경 설정에 따라 로컬 클라이언트 또는 백엔드 학습 어댑터가 결합된 클라이언트를 만든다. */
export async function createGameClient(): Promise<GameClient> {
  const local = new LocalGameClient(new GameStateStore());
  const baseUrl = import.meta.env.VITE_CAT_GAME_API_BASE_URL?.trim();
  if (!baseUrl) {
    return local;
  }
  const configuredUser = import.meta.env.VITE_CAT_GAME_USER_PUBLIC_ID?.trim() || null;
  try {
    const api = new BackendApiClient(baseUrl, configuredUser);
    return await BackendLearningGameClient.create(local, api);
  } catch (error) {
    console.warn("Backend learning connection failed; using local learning tasks.", error);
    return local;
  }
}
