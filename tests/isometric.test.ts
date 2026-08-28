import { describe, expect, it } from "vitest";
import { gridToScreen, screenToGrid } from "../src/game/isometric";

const grid = { tileWidth: 112, tileHeight: 56 };

describe("isometric coordinates", () => {
  it("converts grid coordinates to screen coordinates", () => {
    const point = gridToScreen(grid, 3, 2);
    expect(point.x).toBe(56);
    expect(point.y).toBe(140);
  });

  it("round-trips fractional coordinates", () => {
    const screen = gridToScreen(grid, 4.5, 6.25);
    const cell = screenToGrid(grid, screen.x, screen.y);
    expect(cell.x).toBeCloseTo(4.5);
    expect(cell.y).toBeCloseTo(6.25);
  });
});
