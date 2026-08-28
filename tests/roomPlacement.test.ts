import { describe, expect, it } from "vitest";
import { furnitureDefinitions, isPlacementFree, type PlacedFurniture, rotatedSize } from "../src/domain/room";

describe("room placement", () => {
  const furniture: PlacedFurniture[] = [{ id: "desk", kind: "desk", x: 2, y: 2, rotation: 0 }];

  it("rejects cells outside the grid", () => {
    expect(isPlacementFree(furniture, 10, 8, 9, 7, 2, 1)).toBe(false);
  });

  it("rejects overlaps", () => {
    expect(isPlacementFree(furniture, 10, 8, 3, 2, 1, 1)).toBe(false);
  });

  it("accepts a free area", () => {
    expect(isPlacementFree(furniture, 10, 8, 6, 5, 2, 2)).toBe(true);
  });

  it("swaps the footprint when rotated", () => {
    expect(rotatedSize(furnitureDefinitions.bed, 1)).toEqual({ width: 2, height: 3 });
  });
});
