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

  it("loads server tasks, grades them remotely, and keeps non-learning commands local", async () => {
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
            is_active: true,
            completed: false,
          },
        ]);
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
    expect(client.getQuiz(taskId)?.choices).toHaveLength(2);
    await expect(client.answerQuiz(taskId, "A")).resolves.toMatchObject({
      ok: true,
      correct: true,
      serverAuthoritative: true,
    });
    expect(client.getStudyTasks()[0].completed).toBe(true);
    expect(client.buyShopItem("furniture.sofa")).toMatchObject({ ok: true });
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

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
