export const ATTENDANCE_DAILY_COINS = 100;

export const ATTENDANCE_STREAK_BONUSES: Readonly<Record<number, number>> = {
  3: 150,
  7: 500,
};

/** 다음 출석을 인정할 때 적용할 연속 출석 일수를 계산한다. */
export function nextAttendanceStreak(lastClaimDate: string, currentStreak: number, today: string): number {
  if (lastClaimDate === today) {
    return Math.max(1, currentStreak);
  }
  if (daysBetween(lastClaimDate, today) === 1) {
    return Math.max(1, currentStreak + 1);
  }
  return 1;
}

/** 연속 출석 주기의 해당 일차에 추가로 지급할 코인을 반환한다. */
export function attendanceStreakBonus(streak: number): number {
  if (streak <= 0) {
    return 0;
  }
  const cycleDay = ((streak - 1) % 7) + 1;
  return ATTENDANCE_STREAK_BONUSES[cycleDay] ?? 0;
}

/** 7일 보상판에 표시할 특정 일차의 총 코인 보상을 반환한다. */
export function attendanceRewardForCycleDay(day: number): number {
  return ATTENDANCE_DAILY_COINS + (ATTENDANCE_STREAK_BONUSES[day] ?? 0);
}

function daysBetween(from: string, to: string): number | null {
  const fromTime = parseDateStamp(from);
  const toTime = parseDateStamp(to);
  if (fromTime === null || toTime === null) {
    return null;
  }
  return Math.round((toTime - fromTime) / 86_400_000);
}

function parseDateStamp(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null;
  }
  return timestamp;
}
