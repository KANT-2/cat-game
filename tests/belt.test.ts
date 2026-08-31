import { describe, expect, it } from "vitest";
import { gridCellPolygon, gridToScreen, screenToGrid } from "../src/game/belt";

const grid = {
  columns: 10,
  rows: 8,
  centerX: 800,
  farY: 392,
  nearY: 832,
  farWidth: 1240,
  nearWidth: 1560,
};

describe("belt-stage coordinates", () => {
  it("widens the walkable area toward the viewer", () => {
    const farLeft = gridToScreen(grid, 0, 0);
    const nearLeft = gridToScreen(grid, 0, 8);

    expect(farLeft).toMatchObject({ x: 180, y: 392 });
    expect(nearLeft).toMatchObject({ x: 20, y: 832 });
  });

  it("round-trips fractional coordinates", () => {
    const screen = gridToScreen(grid, 4.5, 6.25);
    const cell = screenToGrid(grid, screen.x, screen.y);

    expect(cell.x).toBeCloseTo(4.5);
    expect(cell.y).toBeCloseTo(6.25);
  });

  it("returns four projected corners for a placement cell", () => {
    expect(gridCellPolygon(grid, 2, 3)).toHaveLength(8);
  });
});
