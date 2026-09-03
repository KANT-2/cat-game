import { afterEach, describe, expect, it, vi } from "vitest";
import { GameStateStore } from "../src/services/gameStateStore";

const SAVE_KEY = "cozy-code-cat-room-v1";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GameStateStore", () => {
  it("migrates legacy saves to the unified coin economy with the Siamese cat stored", () => {
    installStorage({ economyVersion: 1, coins: 321, gems: 8 });

    const state = new GameStateStore().load();

    expect(state.economyVersion).toBe(3);
    expect(state.coins).toBe(100_321);
    expect(state.ownedCats).toEqual(["fluffy", "siamese"]);
    expect(state.homeCats).toEqual(["fluffy"]);
    expect(state.activeCat).toBe("fluffy");
  });

  it("combines version 2 coins and gems while preserving the selected owned cat", () => {
    installStorage({
      economyVersion: 2,
      coins: 654,
      gems: 99_940,
      ownedCats: ["fluffy", "ink"],
      activeCat: "ink",
    });

    const state = new GameStateStore().load();

    expect(state.coins).toBe(100_594);
    expect(state.ownedCats).toEqual(["fluffy", "ink", "siamese"]);
    expect(state.homeCats).toEqual(["ink"]);
    expect(state.activeCat).toBe("ink");
  });

  it("preserves version 3 unified coins without a second currency", () => {
    installStorage({ economyVersion: 3, coins: 777 });

    const state = new GameStateStore().load();

    expect(state.coins).toBe(777);
    expect(state).not.toHaveProperty("gems");
  });

  it("preserves an explicit empty home while keeping cats owned", () => {
    installStorage({
      economyVersion: 2,
      ownedCats: ["fluffy", "ink"],
      homeCats: [],
      activeCat: "ink",
    });

    const state = new GameStateStore().load();

    expect(state.ownedCats).toEqual(["fluffy", "ink", "siamese"]);
    expect(state.homeCats).toEqual([]);
  });
});

function installStorage(savedState: Record<string, unknown>): void {
  const values = new Map([[SAVE_KEY, JSON.stringify(savedState)]]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
}
