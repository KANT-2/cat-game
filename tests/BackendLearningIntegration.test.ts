import { describe, expect, it, vi } from "vitest";
import type { GameStateRepository } from "../src/core/GameClient";
import { LocalGameClient } from "../src/core/LocalGameClient";
import { gachaRewardDefinitions } from "../src/domain/gacha";
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
const catId = "55555555-5555-4555-8555-555555555555";
const catAssetId = "66666666-6666-4666-8666-666666666666";
const sqlTaskId = "77777777-7777-4777-8777-777777777777";

describe("backend learning integration", () => {
  it("accepts every expanded gacha reward from the server", async () => {
    let rewardId = "furniture.ocean.rug";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1000, 0));
      }
      if (path === "/api/v1/game/gacha") {
        return json({
          snapshot: gameSnapshot(970, 0),
          result: {
            rewards: [
              {
                id: rewardId,
                kind: "furniture",
                shop_item_id: rewardId,
                cat_variant: null,
                duplicate: false,
                exchange_coins: 0,
              },
            ],
          },
        });
      }
      return json([]);
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);
    const client = await BackendLearningGameClient.createConnected(new LocalGameClient(new MemoryRepository()), api);
    for (const reward of gachaRewardDefinitions.filter((entry) => entry.kind === "furniture")) {
      rewardId = reward.id;
      await expect(client.drawGacha(1)).resolves.toMatchObject({
        ok: true,
        rewards: [{ id: reward.id, shopItemId: reward.id }],
      });
    }
  });

  it("reports a lagging gacha catalog as a retryable update", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1000, 0));
      }
      if (path === "/api/v1/game/gacha") {
        return json({ detail: "resource-not-found" }, 404);
      }
      return json([]);
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);
    const client = await BackendLearningGameClient.createConnected(new LocalGameClient(new MemoryRepository()), api);

    await expect(client.drawGacha(1)).resolves.toEqual({ ok: false, reason: "catalog-updating" });
  });

  it("uses the same request copy for recommendation, selection and detail views", async () => {
    const task = {
      ...learningTask(taskId, "PYTHON"),
      description: "[고양이 이야기] 츄르 부탁\n\n[도와주세요!] 두 수의 합",
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1000, 0));
      }
      if (path.includes("proficien")) {
        return json([]);
      }
      return json([task]);
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);
    const client = await BackendLearningGameClient.createConnected(new LocalGameClient(new MemoryRepository()), api);
    const expectedSummary = { text: "두 수의 합" };
    const expectedPrompt = { text: "[도와주세요!] 츄르 부탁\n\n[문제] 두 수의 합" };
    expect(client.getStudyTasks()[0].summary).toEqual(expectedSummary);
    expect(client.getQuiz(taskId)?.summary).toEqual(expectedSummary);
    expect(client.getQuiz(taskId)?.prompt).toEqual(expectedPrompt);
  });

  it("turns newline-separated server guidance into progressive code hints", async () => {
    const task = {
      ...learningTask(taskId, "PYTHON"),
      type: "CODE" as const,
      hint_text: "[시작] 입력을 변수에 담으세요.\n[핵심] 두 값을 더하세요.\n[확인] 결과만 출력하세요.",
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1000, 0));
      }
      if (path.includes("proficien")) {
        return json([]);
      }
      return json([task]);
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);
    const client = await BackendLearningGameClient.createConnected(new LocalGameClient(new MemoryRepository()), api);

    expect(client.getCodeChallenge(taskId)?.hints).toEqual([
      { text: "[시작] 입력을 변수에 담으세요." },
      { text: "[핵심] 두 값을 더하세요." },
      { text: "[확인] 결과만 출력하세요." },
    ]);
  });

  it("passes a browser test date only with the recommendations request", async () => {
    vi.stubGlobal("location", { search: "?testDate=2026-09-09" });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/learning/recommendations");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("test_date")).toBe("2026-09-09");
      return json([]);
    });
    try {
      const api = new BackendApiClient("http://localhost:8000", userId, fetcher);
      await expect(api.getLearningRecommendations()).resolves.toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

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

  it("persists the selected learning domain and immediately reloads matching recommendations", async () => {
    let recommendationReads = 0;
    let proficiencyReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      if (pathname === "/api/v1/learning/proficiencies") {
        proficiencyReads += 1;
        return json(
          proficiencyReads === 1
            ? [{ concept_public_id: taskId, domain: "PYTHON", name: "loops", attempts: 2, proficiency_level: 50 }]
            : [{ concept_public_id: sqlTaskId, domain: "SQL", name: "joins", attempts: 0, proficiency_level: 0 }],
        );
      }
      if (pathname === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1_000, 0));
      }
      if (pathname === "/api/v1/learning/recommendations") {
        recommendationReads += 1;
        return json(recommendationReads === 1 ? [learningTask(taskId, "PYTHON")] : [learningTask(sqlTaskId, "SQL")]);
      }
      if (pathname === "/api/v1/game/settings" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toMatchObject({ learning_domain: "SQL" });
        return json({ snapshot: gameSnapshot(1_000, 0, { learningDomain: "SQL" }), result: {} });
      }
      return json({ detail: "not found" }, 404);
    });
    const client = await BackendLearningGameClient.create(
      new LocalGameClient(new MemoryRepository()),
      new BackendApiClient("http://localhost:8000", userId, fetcher),
    );

    await expect(client.updateSettings({ learningDomain: "SQL" })).resolves.toMatchObject({
      learningDomain: "SQL",
    });

    expect(recommendationReads).toBe(2);
    expect(proficiencyReads).toBe(2);
    expect(client.getStudyMastery()).toEqual([{ conceptName: "joins", attempts: 0, proficiencyLevel: 0 }]);
    expect(client.getQuiz(taskId)).toBeNull();
    expect(client.getCodeChallenge(sqlTaskId)).toMatchObject({ language: "sql", editorMode: "query" });
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
      if (url.pathname === "/api/v1/learning/proficiencies") {
        return json([
          {
            concept_public_id: "44444444-4444-4444-8444-444444444444",
            domain: "PYTHON",
            name: "variables",
            attempts: 10,
            proficiency_level: 70,
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
        const body = JSON.parse(String(init.body)) as { item_catalog_key: string };
        if (body.item_catalog_key === "wallpaper.cream") {
          return json({ detail: "already-owned" }, 409);
        }
        if (body.item_catalog_key === "consumable.salmon-cubes") {
          return json({ snapshot: gameSnapshot(320, 1, { consumableQuantity: 1 }), result: {} });
        }
        expect(body).toMatchObject({ item_catalog_key: "furniture.sofa" });
        return json({ snapshot: gameSnapshot(500, 1), result: {} });
      }
      if (url.pathname === "/api/v1/game/consumables/use" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toMatchObject({
          item_catalog_key: "consumable.salmon-cubes",
          cat_catalog_key: "fluffy",
        });
        return json({
          snapshot: gameSnapshot(320, 1, { consumableQuantity: 0 }),
          result: { effect: "happy", remaining_quantity: 0 },
        });
      }
      if (url.pathname === "/api/v1/game/learning/reset" && init?.method === "POST") {
        return json({
          snapshot: gameSnapshot(1_080, 0, { claimedQuestIds: ["solve-one"] }),
          result: { reset_at: "2026-09-05T23:50:00Z", removed_proficiencies: 1 },
        });
      }
      if (url.pathname === "/api/v1/attempts" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body).toMatchObject({
          task_public_id: taskId,
          selected_option: "A",
          context_type: "LEARNING",
        });
        expect(body.request_id).toEqual(expect.any(String));
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
          result_detail: { verdict: "ACCEPTED", passed: 1, total: 1 },
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
    expect(client.getStudyMastery()).toEqual([{ conceptName: "variables", attempts: 10, proficiencyLevel: 70 }]);
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
    await expect(client.buyShopItem("wallpaper.cream")).resolves.toEqual({ ok: false, reason: "already-owned" });
    await expect(client.buyShopItem("consumable.salmon-cubes")).resolves.toMatchObject({
      ok: true,
      itemType: "consumable",
    });
    await expect(client.useConsumable("consumable.salmon-cubes", "fluffy")).resolves.toEqual({
      ok: true,
      itemId: "consumable.salmon-cubes",
      effect: "happy",
      remainingQuantity: 0,
    });
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

  it("loads Part 2 tasks with the backend's public selection filters", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/learning/tasks");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        type: "MULTIPLE_CHOICE",
        domain: "PYTHON",
        concept_public_id: "44444444-4444-4444-8444-444444444444",
        difficulty: "BRONZE",
        limit: "50",
      });
      return json([
        {
          public_id: taskId,
          concept_public_id: "44444444-4444-4444-8444-444444444444",
          concept_name: "PYTHON:variables",
          title: "[SAMPLE:PYTHON:BRONZE:001] 야옹이 간식 세기",
          type: "MULTIPLE_CHOICE",
          domain: "PYTHON",
          difficulty: "BRONZE",
          description: "야옹이의 간식 개수를 골라 주세요.",
          template_code: "",
          options: { A: "야옹~ 3개", B: "야옹~ 5개" },
          hint_text: null,
          reward_coins: 30,
          is_active: true,
          completed: false,
        },
      ]);
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher);

    await expect(
      api.getLearningTasks({
        type: "MULTIPLE_CHOICE",
        domain: "PYTHON",
        conceptPublicId: "44444444-4444-4444-8444-444444444444",
        difficulty: "BRONZE",
        limit: 100,
      }),
    ).resolves.toMatchObject([{ publicId: taskId, title: "[SAMPLE:PYTHON:BRONZE:001] 야옹이 간식 세기" }]);
  });

  it("normalizes non-breaking spaces before submitting SQL code", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      if (pathname === "/api/v1/learning/recommendations") {
        return json([
          {
            public_id: taskId,
            concept_public_id: "44444444-4444-4444-8444-444444444444",
            concept_name: "SQL:select",
            title: "[SAMPLE:SQL:BRONZE:001] 숫자 출력",
            type: "CODE",
            domain: "SQL",
            difficulty: "BRONZE",
            description: "숫자 1을 출력하세요.",
            template_code: "",
            options: null,
            hint_text: null,
            reward_coins: 30,
            is_active: true,
            completed: false,
          },
        ]);
      }
      if (pathname === "/api/v1/learning/proficiencies") {
        return json([]);
      }
      if (pathname === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1_000, 0));
      }
      if (pathname === "/api/v1/attempts" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body).toMatchObject({
          task_public_id: taskId,
          submitted_code: "select 1;",
        });
        expect(body.request_id).toEqual(expect.any(String));
        return json({ public_id: attemptId, status: "PENDING" }, 202);
      }
      if (pathname === `/api/v1/attempts/${attemptId}`) {
        return json({
          public_id: attemptId,
          task_public_id: taskId,
          context_type: "LEARNING",
          status: "COMPLETED",
          is_correct: false,
          used_hint: false,
          attempted_at: "2026-09-07T00:00:00Z",
          result_detail: { verdict: "WRONG_ANSWER", passed: 0, total: 1 },
          coins_awarded: 0,
        });
      }
      return json({ detail: "not found" }, 404);
    });
    const client = await BackendLearningGameClient.create(
      new LocalGameClient(new MemoryRepository()),
      new BackendApiClient("http://localhost:8000", userId, fetcher),
    );

    await expect(client.submitCodeChallenge(taskId, "select\u00a01;", 0)).resolves.toMatchObject({
      ok: true,
      passed: false,
      serverAuthoritative: true,
    });
  });

  it("persists a conversation memory against the owned cat asset", async () => {
    const memories: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      if (pathname === "/api/v1/learning/recommendations") {
        return json([]);
      }
      if (pathname === "/api/v1/learning/proficiencies") {
        return json([]);
      }
      if (pathname === "/api/v1/game/snapshot") {
        return json(gameSnapshot(1_000, 0, { memories }));
      }
      if (pathname === `/api/v1/cats/${catAssetId}/memories` && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { context_summary: string };
        expect(body.context_summary).toContain("오늘의 기분");
        memories.push(body.context_summary);
        return json({ public_id: crypto.randomUUID(), cat_asset_public_id: catAssetId, ...body }, 201);
      }
      return json({ detail: "not found" }, 404);
    });
    const client = await BackendLearningGameClient.create(
      new LocalGameClient(new MemoryRepository()),
      new BackendApiClient("http://localhost:8000", userId, fetcher),
    );

    await expect(client.talkToCat("fluffy", "feelings")).resolves.toEqual({
      ok: true,
      catVariant: "fluffy",
      topic: "feelings",
      memoryCount: 1,
    });
    expect(client.getSnapshot().catMemories.fluffy).toHaveLength(1);
  });

  it("returns guarded server free-chat text and refreshes only remembered conversation", async () => {
    let snapshotReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname === "/health") {
        return json({ status: "ok" });
      }
      if (pathname === "/api/v1/session/me") {
        return json(userPayload());
      }
      if (pathname === "/api/v1/learning/recommendations") {
        return json([]);
      }
      if (pathname === "/api/v1/learning/proficiencies") {
        return json([]);
      }
      if (pathname === "/api/v1/game/snapshot") {
        snapshotReads += 1;
        return json(gameSnapshot(1_000, snapshotReads, { memories: snapshotReads > 1 ? ["코딩 대화"] : [] }));
      }
      if (pathname === `/api/v1/cats/${catAssetId}/chat` && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ message: "파이썬 함수가 어려워", recent_messages: [] });
        return json({
          cat_asset_public_id: catAssetId,
          reply: "작은 예제로 같이 보자, 냐옹.",
          category: "CODING",
          memory_count: 1,
          remembered: true,
        });
      }
      return json({ detail: "not found" }, 404);
    });
    const client = await BackendLearningGameClient.create(
      new LocalGameClient(new MemoryRepository()),
      new BackendApiClient("http://localhost:8000", userId, fetcher),
    );

    await expect(client.chatWithCat("fluffy", "파이썬 함수가 어려워")).resolves.toMatchObject({
      ok: true,
      reply: { text: "작은 예제로 같이 보자, 냐옹." },
      category: "CODING",
      remembered: true,
    });
    expect(snapshotReads).toBe(2);
    expect(client.getSnapshot().catMemories.fluffy).toEqual(["코딩 대화"]);
  });

  it("waits longer than the default transport timeout for cat chat", async () => {
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(
            json({
              cat_asset_public_id: catAssetId,
              reply: "생선도 좋지만 오늘은 츄르가 좋아, 냐옹.",
              category: "COMPANION",
              memory_count: 1,
              remembered: true,
            }),
          );
        }, 20);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Request aborted", "AbortError"));
        });
      });
    });
    const api = new BackendApiClient("http://localhost:8000", userId, fetcher, 1);

    await expect(api.chatWithCat(catAssetId, "츄르랑 생선 중에 뭐가 더 좋아?")).resolves.toMatchObject({
      reply: "생선도 좋지만 오늘은 츄르가 좋아, 냐옹.",
      remembered: true,
    });
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
        return json({
          ...userPayload(),
          platform: { status: "available", profile: { profile_image: "/media/avatar.png" } },
        });
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

    await expect(api.connectBrowserSession()).resolves.toMatchObject({
      publicId: userId,
      profileImageUrl: "http://localhost:8000/api/v1/session/me/profile-image",
    });
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
    consumableQuantity?: number;
    learningDomain?: "PYTHON" | "SQL";
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
      learning_domain: daily.learningDomain ?? "PYTHON",
    },
    cats: [
      {
        public_id: catId,
        cat_asset_public_id: catAssetId,
        catalog_key: "fluffy",
        name: "포근이",
        persona: "느긋하고 다정한 친구",
        owned: true,
        is_home: true,
        memories: daily.memories ?? [],
      },
    ],
    items: [
      {
        catalog_key: "furniture.sofa",
        category: "FURNITURE",
        furniture_kind: "sofa",
        owned_quantity: sofaQuantity,
        available_quantity: sofaQuantity,
      },
      ...(daily.consumableQuantity === undefined
        ? []
        : [
            {
              catalog_key: "consumable.salmon-cubes",
              category: "CONSUMABLE",
              furniture_kind: null,
              owned_quantity: daily.consumableQuantity,
              available_quantity: daily.consumableQuantity,
            },
          ]),
    ],
    placements: [],
  };
}

function learningTask(publicId: string, domain: "PYTHON" | "SQL") {
  return {
    public_id: publicId,
    concept_public_id: "44444444-4444-4444-8444-444444444444",
    concept_name: `${domain}:basics`,
    title: domain === "SQL" ? "SQL 기본 문제" : "Python 기본 문제",
    type: domain === "SQL" ? "CODE" : "MULTIPLE_CHOICE",
    domain,
    difficulty: "BRONZE",
    description: "기본 문제",
    template_code: domain === "SQL" ? "-- 아래에 SQL을 작성하세요.\n" : "",
    options: domain === "SQL" ? null : { A: "정답", B: "오답" },
    hint_text: null,
    reward_coins: 30,
    is_active: true,
    completed: false,
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
