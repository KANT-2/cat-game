import { describe, expect, it } from "vitest";
import { createDefaultState } from "../src/domain/room";
import { getOwnedFurnitureEntries } from "../src/game/presentation/ownedFurniture";

describe("owned furniture presentation", () => {
  it("keeps different products of the same furniture kind selectable", () => {
    const state = createDefaultState();
    state.furniture = [];
    state.inventory.sofa = 3;
    state.shopInventory["furniture.sofa"] = 2;
    state.shopInventory["furniture.forest.bench-2"] = 1;

    const entries = getOwnedFurnitureEntries(state).filter((entry) => entry.kind === "sofa");

    expect(entries).toMatchObject([
      { itemId: "furniture.sofa", stored: 2 },
      { itemId: "furniture.forest.bench-2", stored: 1 },
    ]);
  });

  it("merges legacy generic inventory without counting placed furniture twice", () => {
    const state = createDefaultState();
    state.furniture = [
      { id: "exact-sofa", kind: "sofa", x: 0, y: 0, rotation: 0, shopItemId: "furniture.sofa" },
      { id: "generic-sofa", kind: "sofa", x: 4, y: 0, rotation: 0 },
    ];
    state.inventory.sofa = 2;
    state.shopInventory["furniture.sofa"] = 1;

    const sofa = getOwnedFurnitureEntries(state).find((entry) => entry.itemId === "furniture.sofa");

    expect(sofa).toMatchObject({ stored: 2, placed: 2 });
  });
});
