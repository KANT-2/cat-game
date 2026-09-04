import { describe, expect, it, vi } from "vitest";
import type { GameStateRepository } from "../src/core/GameClient";
import { LocalGameClient } from "../src/core/LocalGameClient";
import { createDefaultState, type GameState } from "../src/domain/room";

class MemoryRepository implements GameStateRepository {
  state = createDefaultState();
  save = vi.fn((state: GameState) => {
    this.state = structuredClone(state);
  });

  load(): GameState {
    return structuredClone(this.state);
  }
}

describe("LocalGameClient", () => {
  it("places furniture through the game contract", () => {
    const repository = new MemoryRepository();
    repository.state.furniture = [];
    const client = new LocalGameClient(repository);
    const listener = vi.fn();
    client.subscribe(listener);

    const result = client.placeFurniture({ kind: "plant", x: 3, y: 3, rotation: 0 });

    expect(result.ok).toBe(true);
    expect(client.getSnapshot().furniture).toHaveLength(1);
    expect(repository.save).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rejects overlapping furniture without saving", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);
    const result = client.placeFurniture({ kind: "plant", x: 1, y: 1, rotation: 0 });

    expect(result).toEqual({ ok: false, reason: "occupied" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("awards a quiz only once", () => {
    const repository = new MemoryRepository();
    repository.state.completedQuizIds = [];
    const client = new LocalGameClient(repository);

    expect(client.answerQuiz("python-range-001", "zero-to-two")).toMatchObject({
      ok: true,
      correct: true,
      firstCompletion: true,
      coinsAwarded: 25,
    });
    expect(client.answerQuiz("python-range-001", "zero-to-two")).toMatchObject({
      ok: true,
      correct: true,
      firstCompletion: false,
      coinsAwarded: 0,
    });
    expect(client.getSnapshot().coins).toBe(1_100_025);
  });

  it("keeps answer validation and rewards inside the game system", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);

    expect(client.answerQuiz("python-range-001", "one-to-three")).toMatchObject({
      ok: true,
      correct: false,
      coinsAwarded: 0,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("buys furniture and consumes one owned item when placed", () => {
    const repository = new MemoryRepository();
    repository.state.furniture = [];
    repository.state.inventory.sofa = 0;
    const client = new LocalGameClient(repository);

    expect(client.buyShopItem("furniture.sofa")).toMatchObject({ ok: true, furnitureKind: "sofa" });
    expect(client.getSnapshot().coins).toBe(1_095_200);
    expect(client.getSnapshot().inventory.sofa).toBe(1);
    expect(client.getSnapshot().shopInventory["furniture.sofa"]).toBe(1);

    expect(
      client.placeFurniture({ kind: "sofa", x: 2, y: 2, rotation: 0, shopItemId: "furniture.sofa" }),
    ).toMatchObject({ ok: true });
    expect(client.getSnapshot().inventory.sofa).toBe(0);
    expect(client.getSnapshot().shopInventory["furniture.sofa"]).toBe(0);
  });

  it("rejects purchases and placement when the player cannot afford or own the item", () => {
    const repository = new MemoryRepository();
    repository.state.coins = 0;
    repository.state.inventory.sofa = 0;
    const client = new LocalGameClient(repository);

    expect(client.buyShopItem("furniture.sofa")).toEqual({ ok: false, reason: "insufficient-coins" });
    expect(client.placeFurniture({ kind: "sofa", x: 0, y: 0, rotation: 0 })).toEqual({
      ok: false,
      reason: "not-owned",
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("buys former premium products with the same coin balance", () => {
    const repository = new MemoryRepository();
    repository.state.coins = 90;
    const client = new LocalGameClient(repository);

    expect(client.buyShopItem("furniture.premiumTower")).toMatchObject({
      ok: true,
      remainingCoins: 0,
    });
    expect(client.getSnapshot().shopInventory["furniture.premiumTower"]).toBe(1);
  });

  it("returns removed furniture to the owned inventory", () => {
    const repository = new MemoryRepository();
    repository.state.inventory.plant = 0;
    const client = new LocalGameClient(repository);

    expect(client.removeFurniture("plant-1")).toBe(true);
    expect(client.getSnapshot().inventory.plant).toBe(1);
  });

  it("keeps the original placement when moving is cancelled or rejected", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);
    const before = client.getSnapshot().furniture.find((item) => item.id === "sofa-1");

    expect(client.moveFurniture("sofa-1", { x: 1, y: 1, rotation: 0 })).toEqual({
      ok: false,
      reason: "occupied",
    });
    expect(client.getSnapshot().furniture.find((item) => item.id === "sofa-1")).toEqual(before);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("returns an exact purchased product to product inventory when stored", () => {
    const repository = new MemoryRepository();
    repository.state.furniture = [];
    repository.state.inventory.sofa = 0;
    const client = new LocalGameClient(repository);
    client.buyShopItem("furniture.sofa");
    const placed = client.placeFurniture({
      kind: "sofa",
      x: 2,
      y: 2,
      rotation: 0,
      shopItemId: "furniture.sofa",
    });
    if (!placed.ok) {
      throw new Error("expected furniture placement to succeed");
    }

    expect(client.removeFurniture(placed.instanceId)).toBe(true);
    expect(client.getSnapshot().shopInventory["furniture.sofa"]).toBe(1);
  });

  it("draws a furniture reward and stores the exact product", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.1);

    const result = client.drawGacha(1);

    expect(result).toMatchObject({
      ok: true,
      remainingCoins: 1_099_970,
      rewards: [{ id: "furniture.desk", duplicate: false }],
    });
    expect(client.getSnapshot().inventory.desk).toBe(1);
    expect(client.getSnapshot().shopInventory["furniture.desk"]).toBe(1);
  });

  it("unlocks a drawn cat and lets the player select it for the home clearing", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.01);

    expect(client.drawGacha(1)).toMatchObject({
      ok: true,
      rewards: [{ id: "cat.ink", catVariant: "ink", duplicate: false }],
    });
    expect(client.getSnapshot().ownedCats).toEqual(["fluffy", "siamese", "ink"]);
    expect(client.getSnapshot().homeCats).toEqual(["fluffy"]);
    expect(client.selectCat("ink")).toEqual({ ok: true, activeCat: "ink" });
    expect(client.getSnapshot().activeCat).toBe("ink");
    expect(client.getSnapshot().homeCats).toEqual(["fluffy", "ink"]);
  });

  it("moves owned cats between the home clearing and storage", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.01);
    client.drawGacha(1);
    client.selectCat("ink");

    expect(client.setCatHome("ink", false)).toEqual({ ok: true, homeCats: ["fluffy"] });
    expect(client.getSnapshot().activeCat).toBe("fluffy");
    expect(client.setCatHome("ink", true)).toEqual({ ok: true, homeCats: ["fluffy", "ink"] });
    expect(client.getSnapshot().ownedCats).toEqual(["fluffy", "siamese", "ink"]);
  });

  it("places the pre-owned Siamese cat from storage onto the home clearing", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);

    expect(client.getSnapshot().ownedCats).toContain("siamese");
    expect(client.getSnapshot().homeCats).not.toContain("siamese");
    expect(client.setCatHome("siamese", true)).toEqual({ ok: true, homeCats: ["fluffy", "siamese"] });
    expect(client.setCatHome("siamese", false)).toEqual({ ok: true, homeCats: ["fluffy"] });
  });

  it("converts a duplicate cat to coins", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.01);
    client.drawGacha(1);

    expect(client.drawGacha(1)).toMatchObject({
      ok: true,
      remainingCoins: 1_099_955,
      rewards: [{ id: "cat.ink", duplicate: true, exchangeCoins: 15 }],
    });
    expect(client.getSnapshot().ownedCats).toEqual(["fluffy", "siamese", "ink"]);
  });

  it("gives eleven independently drawn rewards for the multi draw", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.9);

    const result = client.drawGacha(11);

    expect(result).toMatchObject({ ok: true, remainingCoins: 1_099_730 });
    if (!result.ok) {
      throw new Error("expected multi draw to succeed");
    }
    expect(result.rewards).toHaveLength(11);
    expect(result.rewards.every((reward) => reward.id === "furniture.sofa")).toBe(true);
    expect(client.getSnapshot().shopInventory["furniture.sofa"]).toBe(11);
  });

  it("rejects a draw without enough coins and cannot select an unowned cat", () => {
    const repository = new MemoryRepository();
    repository.state.coins = 0;
    const client = new LocalGameClient(repository, () => 0.01);

    expect(client.drawGacha(1)).toEqual({ ok: false, reason: "insufficient-coins" });
    expect(client.selectCat("ink")).toEqual({ ok: false, reason: "cat-not-owned" });
    expect(client.setCatHome("ink", true)).toEqual({ ok: false, reason: "cat-not-owned" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("grades a function-body challenge and preserves the base reward when hints are used", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(
      repository,
      () => 0.5,
      () => new Date(2026, 8, 3),
    );

    const failed = client.submitCodeChallenge("python-sum-001", "    return 0", 0);
    expect(failed).toMatchObject({ ok: true, passed: false, coinsAwarded: 0 });

    const passed = client.submitCodeChallenge(
      "python-sum-001",
      "    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total",
      2,
    );
    expect(passed).toMatchObject({ ok: true, passed: true, firstCompletion: true, coinsAwarded: 40 });
    expect(client.getSnapshot().completedCodeChallengeIds).toEqual(["python-sum-001"]);
    expect(client.getSnapshot().dailyCompletedTaskIds).toEqual(["python-sum-001"]);
  });

  it("tracks daily missions and pays each reward only once", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(
      repository,
      () => 0.5,
      () => new Date(2026, 8, 3),
    );
    client.answerQuiz("python-range-001", "zero-to-two");

    expect(client.getDailyQuests()[0]).toMatchObject({ progress: 1, complete: true, claimed: false });
    expect(client.claimDailyQuest("solve-one")).toEqual({ ok: true, coinsAwarded: 50 });
    expect(client.claimDailyQuest("solve-one")).toEqual({ ok: false, reason: "already-claimed" });
    expect(client.claimDailyBonus()).toEqual({ ok: false, reason: "bonus-not-ready" });
  });

  it("pays the completed daily bonus entirely in coins", () => {
    const repository = new MemoryRepository();
    repository.state.dailyQuestDate = "2026-09-03";
    repository.state.claimedDailyQuestIds = ["solve-one", "solve-three", "finish-code"];
    const client = new LocalGameClient(
      repository,
      () => 0.5,
      () => new Date(2026, 8, 3),
    );

    expect(client.claimDailyBonus()).toEqual({ ok: true, coinsAwarded: 310 });
    expect(client.getSnapshot().coins).toBe(1_100_310);
  });

  it("resets daily progress when the local date changes", () => {
    const repository = new MemoryRepository();
    let day = 3;
    const client = new LocalGameClient(
      repository,
      () => 0.5,
      () => new Date(2026, 8, day),
    );
    client.answerQuiz("python-range-001", "zero-to-two");
    expect(client.getDailyQuests()[0].progress).toBe(1);

    day = 4;
    expect(client.getDailyQuests()[0].progress).toBe(0);
    expect(client.getSnapshot().claimedDailyQuestIds).toEqual([]);
  });

  it("pays attendance once per local day", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(
      repository,
      () => 0.5,
      () => new Date(2026, 8, 4),
    );

    expect(client.getAttendance()).toMatchObject({ canClaim: true, nextStreak: 1, totalCoins: 100 });
    expect(client.claimAttendance()).toMatchObject({
      ok: true,
      claimedDate: "2026-09-04",
      currentStreak: 1,
      coinsAwarded: 100,
    });
    expect(client.claimAttendance()).toEqual({ ok: false, reason: "already-claimed" });
    expect(client.getSnapshot().coins).toBe(1_100_100);
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it("adds the third-day streak bonus and resets after a missed day", () => {
    const repository = new MemoryRepository();
    repository.state.attendanceLastClaimDate = "2026-09-02";
    repository.state.attendanceStreak = 2;
    repository.state.attendanceLongestStreak = 2;
    repository.state.attendanceClaimedDates = ["2026-09-01", "2026-09-02"];
    let day = 3;
    const client = new LocalGameClient(
      repository,
      () => 0.5,
      () => new Date(2026, 8, day),
    );

    expect(client.claimAttendance()).toMatchObject({
      ok: true,
      currentStreak: 3,
      dailyCoins: 100,
      streakBonus: 150,
      coinsAwarded: 250,
    });
    expect(client.getSnapshot().attendanceLongestStreak).toBe(3);

    day = 5;
    expect(client.claimAttendance()).toMatchObject({ ok: true, currentStreak: 1, coinsAwarded: 100 });
  });

  it("buys and applies owned wallpaper without adding furniture inventory", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);
    const before = client.getSnapshot().inventory;

    expect(client.buyShopItem("wallpaper.cream")).toMatchObject({ ok: true, itemType: "wallpaper" });
    expect(client.getSnapshot().inventory).toEqual(before);
    expect(client.applyRoomTheme("wallpaper.cream")).toEqual({
      ok: true,
      itemId: "wallpaper.cream",
      itemType: "wallpaper",
    });
    expect(client.getSnapshot().activeWallpaper).toBe("wallpaper.cream");
  });

  it("persists sound settings and clears only cat memories", () => {
    const repository = new MemoryRepository();
    repository.state.catMemories = { fluffy: ["반복문을 연습했어요"] };
    const client = new LocalGameClient(repository);

    expect(client.updateSettings({ bgmEnabled: false, effectsVolume: 37 })).toMatchObject({
      bgmEnabled: false,
      effectsVolume: 40,
    });
    expect(client.clearCatMemories()).toEqual({ ok: true, removed: 1 });
    expect(client.getSnapshot().ownedCats).toContain("fluffy");
    expect(client.getSnapshot().catMemories).toEqual({});
  });
});
