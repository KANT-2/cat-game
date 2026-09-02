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
    expect(client.getSnapshot().coins).toBe(1_000_025);
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
    expect(client.getSnapshot().coins).toBe(995_200);
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
      remainingGems: 99_970,
      rewards: [{ id: "furniture.desk", rarity: "SR", duplicate: false }],
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

  it("converts a duplicate cat to gems", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.01);
    client.drawGacha(1);

    expect(client.drawGacha(1)).toMatchObject({
      ok: true,
      remainingGems: 99_955,
      rewards: [{ id: "cat.ink", duplicate: true, exchangeGems: 15 }],
    });
    expect(client.getSnapshot().ownedCats).toEqual(["fluffy", "siamese", "ink"]);
  });

  it("gives eleven rewards with an SR guarantee for the multi draw", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository, () => 0.9);

    const result = client.drawGacha(11);

    expect(result).toMatchObject({ ok: true, remainingGems: 99_730 });
    if (!result.ok) {
      throw new Error("expected multi draw to succeed");
    }
    expect(result.rewards).toHaveLength(11);
    expect(result.rewards.some((reward) => reward.rarity === "SR" || reward.rarity === "SSR")).toBe(true);
    expect(client.getSnapshot().shopInventory["furniture.desk"]).toBe(1);
  });

  it("rejects a draw without enough gems and cannot select an unowned cat", () => {
    const repository = new MemoryRepository();
    repository.state.gems = 0;
    const client = new LocalGameClient(repository, () => 0.01);

    expect(client.drawGacha(1)).toEqual({ ok: false, reason: "insufficient-gems" });
    expect(client.selectCat("ink")).toEqual({ ok: false, reason: "cat-not-owned" });
    expect(client.setCatHome("ink", true)).toEqual({ ok: false, reason: "cat-not-owned" });
    expect(repository.save).not.toHaveBeenCalled();
  });
});
