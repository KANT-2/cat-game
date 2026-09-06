import { describe, expect, it, vi } from "vitest";
import type { GameStateRepository } from "../src/core/GameClient";
import { LocalGameClient } from "../src/core/LocalGameClient";
import { createDefaultState, type GameState } from "../src/domain/room";
import { BackendApiClient } from "../src/services/BackendApiClient";
import { BackendLearningGameClient } from "../src/services/BackendLearningGameClient";

class MemoryRepository implements GameStateRepository {
  private state = createDefaultState();

  load(): GameState {
    return structuredClone(this.state);
  }

  save(state: GameState): void {
    this.state = structuredClone(state);
  }
}

const userId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const attemptId = "33333333-3333-4333-8333-333333333333";

describe("backend learning integration", () => {
  it("calls the browser fetch implementation with its required global receiver", async () => {
    const originalFetch = globalThis.fetch;
    const browserFetch = vi.fn(function (this: unknown, input: RequestInfo | URL) {
      expect(this).toBe(globalThis);
      const pathname = new URL(String(input)).pathname;
      return Promise.resolve(json(pathname === "/health" ? { status: "ok" } : userPayload()));
    });
    globalThis.fetch = browserFetch;
    try {
      const api = new BackendApiClient("http://localhost:8000", userId);
      await expect(api.connect()).resolves.toMatchObject({ publicId: userId });
      expect(browserFetch).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("loads server state and tasks, then keeps game mutations authoritative", async () => {
    let snapshotReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      if (url.pathname === "/health") {
        expect(headers.has("X-User-Public-ID")).toBe(false);
        return json({ status: "ok" });
      }
      if (url.pathname === "/api/v1/session/development") {
        expect(init?.method).toBe("POST");
        return json(userPayload());
      }
      expect(headers.get("X-User-Public-ID")).toBe(userId);
      if (url.pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      if (url.pathname === "/api/v1/learning/recommendations") {
        return json([
          {
            public_id: taskId,
            concept_public_id: "44444444-4444-4444-8444-444444444444",
            concept_name: "PYTHON:variables",
            title: "[SAMPLE:PYTHON:BRONZE:001] 두 수의 합",
            type: "MULTIPLE_CHOICE",
            domain: "PYTHON",
            difficulty: "BRONZE",
            description: "가장 올바른 설명을 고르세요.",
            template_code: "",
            options: { A: "두 값을 더합니다.", B: "고정값만 출력합니다." },
            hint_text: null,
            reward_coins: 30,
            is_active: true,
            completed: false,
          },
        ]);
      }
      if (url.pathname === "/api/v1/game/snapshot") {
        snapshotReads += 1;
        return json(
          snapshotReads === 1
            ? gameSnapshot(1_000, 0, { memories: ["반복문을 연습했어요"] })
            : gameSnapshot(1_030, 0, { completedTaskIds: [taskId], hasCodeCompletion: false }),
        );
      }
      if (url.pathname === "/api/v1/game/cat-memories" && init?.method === "DELETE") {
        return json({ snapshot: gameSnapshot(1_000, 0), result: { removed: 1 } });
      }
      if (url.pathname === "/api/v1/game/daily-rewards/claims" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ reward_key: "solve-one" });
        return json({
          snapshot: gameSnapshot(1_080, 0, {
            completedTaskIds: [taskId],
            claimedQuestIds: ["solve-one"],
            hasCodeCompletion: false,
          }),
          result: { reward_key: "solve-one", coins_awarded: 50 },
        });
      }
      if (url.pathname === "/api/v1/game/shop/purchases" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toMatchObject({ item_catalog_key: "furniture.sofa", quantity: 1 });
        return json({ snapshot: gameSnapshot(500, 1), result: {} });
      }
      if (url.pathname === "/api/v1/game/learning/reset" && init?.method === "POST") {
        return json({
          snapshot: gameSnapshot(1_080, 0, { claimedQuestIds: ["solve-one"] }),
          result: { reset_at: "2026-09-05T23:50:00Z", removed_proficiencies: 1 },
        });
      }
      if (url.pathname === "/api/v1/attempts" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toMatchObject({
          task_public_id: taskId,
          selected_option: "A",
          context_type: "LEARNING",
        });
        return json({ public_id: attemptId, status: "PENDING" }, 202);
      }
      if (url.pathname === `/api/v1/attempts/${attemptId}`) {
        return json({
          public_id: attemptId,
          task_public_id: taskId,
          context_type: "LEARNING",
          status: "COMPLETED",
          is_correct: true,
          used_hint: false,
          attempted_at: "2026-09-04T00:00:00Z",
          result_detail: null,
          coins_awarded: 30,
        });
      }
      return json({ detail: "not found" }, 404);
    });
    const local = new LocalGameClient(new MemoryRepository());
    const api = new BackendApiClient("http://localhost:8000", null, fetcher);
    const client = await BackendLearningGameClient.create(local, api);

    expect(client.getStudyTasks()).toMatchObject([
      { id: taskId, type: "quiz", concept: "variables", title: { text: "두 수의 합" }, completed: false },
    ]);
    expect(client.getSnapshot().catMemories.fluffy).toEqual(["반복문을 연습했어요"]);
    await expect(client.clearCatMemories()).resolves.toEqual({ ok: true, removed: 1 });
    expect(client.getSnapshot().catMemories).toEqual({});
    expect(client.getQuiz(taskId)?.choices).toHaveLength(2);
    await expect(client.answerQuiz(taskId, "A")).resolves.toMatchObject({
      ok: true,
      correct: true,
      firstCompletion: true,
      coinsAwarded: 30,
      serverAuthoritative: true,
    });
    expect(client.getStudyTasks()[0].completed).toBe(true);
    expect(client.getSnapshot().coins).toBe(1_030);
    expect(client.getDailyQuests()[0]).toMatchObject({ progress: 1, complete: true, claimed: false });
    await expect(client.claimDailyQuest("solve-one")).resolves.toEqual({ ok: true, coinsAwarded: 50 });
    expect(client.getDailyQuests()[0].claimed).toBe(true);
    expect(client.getSnapshot().coins).toBe(1_080);
    await expect(client.resetLearningProgress()).resolves.toEqual({ ok: true });
    expect(client.getStudyTasks()[0].completed).toBe(false);
    expect(client.getSnapshot().coins).toBe(1_080);
    expect(client.getDailyQuests()[0]).toMatchObject({ progress: 0, claimed: true });
    await expect(client.buyShopItem("furniture.sofa")).resolves.toMatchObject({ ok: true });
    expect(client.getSnapshot()).toMatchObject({ coins: 500, shopInventory: { "furniture.sofa": 1 } });
    const refreshed = vi.fn();
    client.subscribe(refreshed);
    await expect(client.refreshFromServer()).resolves.toBe(true);
    expect(refreshed).toHaveBeenCalledOnce();
    expect(client.getSnapshot().coins).toBe(1_030);
  });

  it("rejects malformed server task data instead of leaking it into the UI", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      return json([{ public_id: taskId, type: "UNKNOWN" }]);
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);

    await api.connect();
    await expect(api.getLearningRecommendations()).rejects.toThrow("Backend field");
  });

  it("uses browser cookies and CSRF protection without exposing the development user header", async () => {
    const requests: Array<{ init: RequestInit | undefined; pathname: string }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      requests.push({ init, pathname });
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      if (pathname === "/api/v1/session/logout") {
        return new Response(null, { status: 204 });
      }
      if (pathname === "/api/v1/game/settings") {
        return json({ snapshot: gameSnapshot(1_000, 0), result: {} });
      }
      return json({ detail: "not found" }, 404);
    });
    const api = new BackendApiClient("http://localhost:8000", null, fetcher, 5_000, () => "csrf-token");

    await expect(api.connectBrowserSession()).resolves.toMatchObject({ publicId: userId });
    await api.updateGameSettings({ reducedMotion: true });
    await expect(api.logout()).resolves.toBeUndefined();

    expect(requests).toHaveLength(4);
    for (const request of requests) {
      expect(request.init?.credentials).toBe("include");
      expect(new Headers(request.init?.headers).has("X-User-Public-ID")).toBe(false);
    }
    expect(new Headers(requests[2].init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(new Headers(requests[3].init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
  });

  it("uses the public registration and login contracts to rotate browser sessions", async () => {
    const requests: Array<{ body: unknown; pathname: string }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      requests.push({ body: init?.body ? JSON.parse(String(init.body)) : null, pathname });
      if (pathname === "/api/v1/session/logout") {
        return new Response(null, { status: 204 });
      }
      return json(userPayload(), pathname.endsWith("/register") ? 201 : 200);
    });
    const api = new BackendApiClient("http://localhost:8000", null, fetcher, 5_000, () => "csrf-token");

    await api.register("cat@example.com", "cat", "correct-horse-2026");
    await api.logout();
    await api.login("cat@example.com", "correct-horse-2026");

    expect(requests).toEqual([
      {
        pathname: "/api/v1/session/register",
        body: { email: "cat@example.com", username: "cat", password: "correct-horse-2026" },
      },
      { pathname: "/api/v1/session/logout", body: null },
      {
        pathname: "/api/v1/session/login",
        body: { email: "cat@example.com", password: "correct-horse-2026" },
      },
    ]);
  });

  it("reports an expired browser session once when an authenticated request returns 401", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      return json({ detail: "authentication-required" }, 401);
    });
    const expired = vi.fn();
    const api = new BackendApiClient("http://localhost:8000", null, fetcher);

    await api.connectBrowserSession();
    api.setAuthenticationExpiredListener(expired);
    await expect(api.getGameSnapshot()).rejects.toMatchObject({ status: 401 });
    await expect(api.getGameSnapshot()).rejects.toThrow("Backend user session is not connected");

    expect(expired).toHaveBeenCalledOnce();
  });

  it("retries a temporary failure only for a safe request and keeps one trace id", async () => {
    let healthAttempts = 0;
    const requestIds: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestIds.push(new Headers(init?.headers).get("X-Request-ID") ?? "");
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        healthAttempts += 1;
        if (healthAttempts === 1) {
          return json({ detail: "temporarily-unavailable" }, 503);
        }
        return json({ status: "ok" });
      }
      return json(userPayload());
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);

    await api.connect();

    expect(healthAttempts).toBe(2);
    expect(requestIds).toHaveLength(3);
    expect(requestIds[0]).toBe(requestIds[1]);
    expect(requestIds[2]).not.toBe(requestIds[1]);
  });
});

function userPayload() {
  return {
    public_id: userId,
    email: "player@local.nyang",
    username: "{ 냥 } 플레이어",
    role: "STUDENT",
    balance: 1_100_000,
    mileage: 0,
    house_level: 1,
    created_at: "2026-09-04T00:00:00Z",
  };
}

function gameSnapshot(
  balance: number,
  sofaQuantity: number,
  daily: {
    completedTaskIds?: string[];
    claimedQuestIds?: string[];
    hasCodeCompletion?: boolean;
    bonusClaimed?: boolean;
    memories?: string[];
  } = {},
) {
  return {
    catalog_version: 1,
    state_version: 1,
    balance,
    mileage: 0,
    house_level: 1,
    active_cat_key: "fluffy",
    active_wallpaper_key: null,
    active_floor_key: null,
    attendance_last_claim_date: "",
    attendance_streak: 0,
    attendance_longest_streak: 0,
    attendance_claimed_dates: [],
    daily_quest_date: "2026-09-05",
    daily_completed_task_ids: daily.completedTaskIds ?? [],
    daily_has_code_completion: daily.hasCodeCompletion ?? false,
    claimed_daily_quest_ids: daily.claimedQuestIds ?? [],
    daily_bonus_claimed: daily.bonusClaimed ?? false,
    settings: {
      bgm_enabled: true,
      bgm_volume: 70,
      effects_enabled: true,
      effects_volume: 80,
      reduced_motion: false,
    },
    cats: [{ catalog_key: "fluffy", owned: true, is_home: true, memories: daily.memories ?? [] }],
    items: [
      {
        catalog_key: "furniture.sofa",
        category: "FURNITURE",
        furniture_kind: "sofa",
        owned_quantity: sofaQuantity,
        available_quantity: sofaQuantity,
      },
    ],
    placements: [],
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
