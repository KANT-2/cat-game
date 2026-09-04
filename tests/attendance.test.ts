import { describe, expect, it } from "vitest";
import { attendanceRewardForCycleDay, attendanceStreakBonus, nextAttendanceStreak } from "../src/domain/attendance";

describe("attendance rules", () => {
  it("continues only on the next local calendar day", () => {
    expect(nextAttendanceStreak("2026-09-03", 2, "2026-09-04")).toBe(3);
    expect(nextAttendanceStreak("2026-09-01", 5, "2026-09-04")).toBe(1);
    expect(nextAttendanceStreak("", 0, "2026-09-04")).toBe(1);
  });

  it("adds milestone bonuses on the third and seventh cycle days", () => {
    expect(attendanceStreakBonus(1)).toBe(0);
    expect(attendanceStreakBonus(3)).toBe(150);
    expect(attendanceStreakBonus(7)).toBe(500);
    expect(attendanceStreakBonus(10)).toBe(150);
    expect(attendanceRewardForCycleDay(7)).toBe(600);
  });
});
