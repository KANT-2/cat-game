import { describe, expect, it } from "vitest";
import { projectDirectionalShadow, shadowCastDirectionFromSunPosition } from "../src/game/entities/shadowProjection";

const sunlight = { xPerHeight: 0.78, yPerHeight: 0.46 };

describe("directional shadow projection", () => {
  it("keeps the cast direction vertical when the sun is directly above the cat", () => {
    expect(shadowCastDirectionFromSunPosition({ x: 0, y: 0 })).toEqual({ xPerHeight: -0, yPerHeight: -0 });
  });

  it("casts the shadow opposite the sun position", () => {
    expect(shadowCastDirectionFromSunPosition({ x: 100, y: -100 })).toEqual({
      xPerHeight: -0.8,
      yPerHeight: 0.55,
    });
  });

  it("keeps the shadow at the ground point when height is zero", () => {
    expect(projectDirectionalShadow({ x: 800, y: 450 }, 0, sunlight)).toEqual({ x: 800, y: 450 });
  });

  it("moves twice as far along the same light direction when height doubles", () => {
    const low = projectDirectionalShadow({ x: 800, y: 450 }, 50, sunlight);
    const high = projectDirectionalShadow({ x: 800, y: 450 }, 100, sunlight);

    expect(high.x - 800).toBeCloseTo((low.x - 800) * 2);
    expect(high.y - 450).toBeCloseTo((low.y - 450) * 2);
  });

  it("preserves the same offset when the cat moves across the ground", () => {
    const left = projectDirectionalShadow({ x: 300, y: 280 }, 80, sunlight);
    const right = projectDirectionalShadow({ x: 700, y: 520 }, 80, sunlight);

    expect(right.x - left.x).toBeCloseTo(400);
    expect(right.y - left.y).toBeCloseTo(240);
  });
});
