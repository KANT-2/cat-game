import { Point } from "pixi.js";

/** 2:1 아이소메트릭 좌표 변환에 필요한 논리 타일 크기다. */
export type IsometricGrid = {
  tileWidth: number;
  tileHeight: number;
};

/**
 * 논리 격자 좌표를 아이소메트릭 방 컨테이너 내부 좌표로 투영한다.
 *
 * @param grid - 한 논리 셀을 그리는 타일의 픽셀 너비와 높이.
 * @param x - 가로 격자축 위치. 셀 중심 표현을 위해 소수점도 허용한다.
 * @param y - 세로 격자축 위치. 셀 중심 표현을 위해 소수점도 허용한다.
 * @returns 별도의 화면 origin을 더하지 않은 PixiJS `Point`.
 *
 * @remarks
 * `(0, 0)`은 방 컨테이너의 원점이다. 카메라 이동과 화면 중앙 정렬은 호출자가
 * 상위 컨테이너의 position과 scale로 적용한다.
 */
export function gridToScreen(grid: IsometricGrid, x: number, y: number): Point {
  return new Point((x - y) * (grid.tileWidth / 2), (x + y) * (grid.tileHeight / 2));
}

/**
 * 아이소메트릭 방 컨테이너 내부 좌표를 논리 격자 좌표로 역투영한다.
 *
 * @param grid - 정방향 투영에 사용한 것과 같은 타일 픽셀 크기.
 * @param screenX - 방 컨테이너 원점을 기준으로 한 X 좌표.
 * @param screenY - 방 컨테이너 원점을 기준으로 한 Y 좌표.
 * @returns 셀 경계에서 반올림하지 않은 소수점 격자 좌표.
 *
 * @remarks 포인터 좌표가 전역 좌표라면 이 함수를 호출하기 전에 컨테이너의 로컬 좌표로 변환해야 한다.
 */
export function screenToGrid(grid: IsometricGrid, screenX: number, screenY: number): Point {
  return new Point(
    screenY / grid.tileHeight + screenX / grid.tileWidth,
    screenY / grid.tileHeight - screenX / grid.tileWidth,
  );
}
