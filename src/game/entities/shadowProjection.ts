export type ScreenPoint = {
  x: number;
  y: number;
};

export type ShadowCastDirection = {
  xPerHeight: number;
  yPerHeight: number;
};

export type SunPosition = {
  x: number;
  y: number;
};

/**
 * 고양이 바로 위를 원점으로 하는 해 위치를 그림자가 뻗는 화면 방향으로 바꾼다.
 *
 * @param sun - 하늘 평면의 해 위치. x·y 모두 -100부터 100까지의 상대값이다.
 * @returns 화면상 높이 1px당 그림자 바닥 접점의 이동 비율.
 * @remarks 해의 반대편으로 그림자가 생기며 `(0, 0)`은 고양이 바로 위라서 지면 이동이 없다.
 */
export function shadowCastDirectionFromSunPosition(sun: SunPosition): ShadowCastDirection {
  return {
    xPerHeight: -(sun.x / 100) * 0.8,
    yPerHeight: -(sun.y / 100) * 0.55,
  };
}

/**
 * 멀리 있는 햇빛을 가정해 높이만큼 그림자 바닥 접점을 평행 이동한다.
 *
 * @param ground - 고양이 바로 아래의 Canvas 바닥 좌표.
 * @param screenHeight - 원근 배율까지 적용된 화면상 높이(px). 0 이상이어야 한다.
 * @param direction - 화면상 높이 1px당 그림자가 이동할 x·y 비율.
 * @returns 같은 광원 방향으로 이동한 그림자 바닥 접점.
 * @remarks 평행광 모델이므로 고양이의 X·Y 위치가 달라도 방향과 이동 비율은 바뀌지 않는다.
 */
export function projectDirectionalShadow(
  ground: ScreenPoint,
  screenHeight: number,
  direction: ShadowCastDirection,
): ScreenPoint {
  const safeHeight = Math.max(0, screenHeight);
  return {
    x: ground.x + safeHeight * direction.xPerHeight,
    y: ground.y + safeHeight * direction.yPerHeight,
  };
}
