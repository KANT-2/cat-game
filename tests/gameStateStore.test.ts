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

  it("clears previously applied room themes once while preserving owned themes", () => {
    installStorage({
      economyVersion: 3,
      coins: 777,
      shopInventory: { "wallpaper.cream": 1, "floor.oak": 1 },
      activeWallpaper: "wallpaper.cream",
      activeFloor: "floor.oak",
    });

    const migrated = new GameStateStore().load();

    expect(migrated.roomAppearanceVersion).toBe(1);
    expect(migrated.activeWallpaper).toBeNull();
    expect(migrated.activeFloor).toBeNull();
    expect(migrated.shopInventory).toMatchObject({ "wallpaper.cream": 1, "floor.oak": 1 });

    installStorage({ ...migrated, activeWallpaper: "wallpaper.cream", activeFloor: "floor.oak" });
    expect(new GameStateStore().load()).toMatchObject({
      activeWallpaper: "wallpaper.cream",
      activeFloor: "floor.oak",
    });
  });

  it("migrates missing attendance fields and preserves valid attendance history", () => {
    installStorage({ economyVersion: 3, coins: 777 });
    expect(new GameStateStore().load()).toMatchObject({
      attendanceLastClaimDate: "",
      attendanceStreak: 0,
      attendanceLongestStreak: 0,
      attendanceClaimedDates: [],
    });

    installStorage({
      economyVersion: 3,
      coins: 777,
      attendanceLastClaimDate: "2026-09-04",
      attendanceStreak: 3,
      attendanceLongestStreak: 5,
      attendanceClaimedDates: ["invalid", "2026-09-03", "2026-09-04"],
    });
    expect(new GameStateStore().load()).toMatchObject({
      attendanceLastClaimDate: "2026-09-04",
      attendanceStreak: 3,
      attendanceLongestStreak: 5,
      attendanceClaimedDates: ["2026-09-03", "2026-09-04"],
    });
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
