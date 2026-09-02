const PHASE_EPSILON = 0.000_001;

export type CatMovementTiming = {
  cycleProgressPerGridUnit: number;
  plannedCycleProgress: number;
};

/**
 * 남은 이동 거리를 완전한 보폭 수에 맞춰 애니메이션 진행률로 변환한다.
 *
 * @param distance - 현재 위치부터 목적지까지의 논리 그리드 거리. 0보다 커야 한다.
 * @param currentCycleProgress - 현재 보폭의 0 이상 1 미만 진행률.
 * @param nominalCycleDistance - 원래 재생 속도로 한 보폭 동안 이동하는 논리 그리드 거리.
 * @returns 목적지에서 보폭 경계에 정확히 도착하기 위한 거리당 진행률과 총 진행량.
 * @remarks 이동 속도는 바꾸지 않고 애니메이션 재생 속도만 목적지까지의 거리에 맞게 미세 조정한다.
 */
export function planCatMovementTiming(
  distance: number,
  currentCycleProgress: number,
  nominalCycleDistance: number,
): CatMovementTiming {
  if (distance <= 0 || nominalCycleDistance <= 0) {
    return { cycleProgressPerGridUnit: 0, plannedCycleProgress: 0 };
  }

  const normalizedProgress = normalizeCycleProgress(currentCycleProgress);
  const progressToBoundary = normalizedProgress > PHASE_EPSILON ? 1 - normalizedProgress : 1;
  const nominalProgress = distance / nominalCycleDistance;
  const additionalCycles = Math.max(0, Math.round(nominalProgress - progressToBoundary));
  const plannedCycleProgress = progressToBoundary + additionalCycles;

  return {
    cycleProgressPerGridUnit: plannedCycleProgress / distance,
    plannedCycleProgress,
  };
}

/**
 * 누적 보폭 진행률을 현재 루프 안의 0 이상 1 미만 값으로 정규화한다.
 *
 * @param progress - 거리 이동으로 누적된 보폭 진행률.
 * @returns 현재 보폭 안의 진행률. 경계에 매우 가까운 값은 0으로 맞춘다.
 */
export function normalizeCycleProgress(progress: number): number {
  const normalized = ((progress % 1) + 1) % 1;
  if (normalized < PHASE_EPSILON || 1 - normalized < PHASE_EPSILON) {
    return 0;
  }
  return normalized;
}
