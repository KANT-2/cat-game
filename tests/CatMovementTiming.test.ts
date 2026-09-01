import { describe, expect, it } from "vitest";
import { normalizeCycleProgress, planCatMovementTiming } from "../src/game/entities/CatMovementTiming";

describe("cat movement timing", () => {
  it("finishes a new movement on a complete stride boundary", () => {
    const timing = planCatMovementTiming(1, 0, 0.92);

    expect(timing.plannedCycleProgress).toBe(1);
    expect(normalizeCycleProgress(1 * timing.cycleProgressPerGridUnit)).toBe(0);
  });

  it("preserves the current foot phase when the target changes", () => {
    const timing = planCatMovementTiming(2.4, 0.35, 0.92);
    const finalProgress = 0.35 + 2.4 * timing.cycleProgressPerGridUnit;

    expect(timing.plannedCycleProgress).toBe(2.65);
    expect(normalizeCycleProgress(finalProgress)).toBe(0);
  });

  it("returns a stopped plan for invalid distances", () => {
    expect(planCatMovementTiming(0, 0.5, 1)).toEqual({
      cycleProgressPerGridUnit: 0,
      plannedCycleProgress: 0,
    });
    expect(planCatMovementTiming(1, 0.5, 0)).toEqual({
      cycleProgressPerGridUnit: 0,
      plannedCycleProgress: 0,
    });
  });
});
