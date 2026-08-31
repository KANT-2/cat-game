import { Point } from "pixi.js";

/** 한 화면 벨트 스테이지의 논리 격자를 Canvas 좌표로 투영하는 설정이다. */
export type BeltGrid = {
  columns: number;
  rows: number;
  centerX: number;
  farY: number;
  nearY: number;
  farWidth: number;
  nearWidth: number;
};

/**
 * 논리 격자 좌표를 고정 카메라 벨트 스테이지의 화면 좌표로 투영한다.
 *
 * @param grid - 격자 크기와 공터의 원근 사다리꼴을 정의하는 설정.
 * @param x - 공터의 좌우 논리 좌표. `0`은 왼쪽 경계, `columns`는 오른쪽 경계다.
 * @param y - 공터의 깊이 논리 좌표. `0`은 먼 경계, `rows`는 가까운 경계다.
 * @returns 기준 해상도 Canvas 안에서 사용할 PixiJS `Point`.
 *
 * @remarks 논리 상태를 변경하지 않는 순수 변환이다. 화면 깊이가 커질수록 사용할 수 있는 가로 폭이 넓어진다.
 */
export function gridToScreen(grid: BeltGrid, x: number, y: number): Point {
  const depth = y / grid.rows;
  const width = grid.farWidth + (grid.nearWidth - grid.farWidth) * depth;
  return new Point(grid.centerX + (x / grid.columns - 0.5) * width, grid.farY + (grid.nearY - grid.farY) * depth);
}

/**
 * 고정 카메라 벨트 스테이지의 화면 좌표를 논리 격자 좌표로 역투영한다.
 *
 * @param grid - 정방향 투영에 사용한 것과 같은 벨트 격자 설정.
 * @param screenX - 기준 해상도 Canvas의 가로 좌표.
 * @param screenY - 기준 해상도 Canvas의 세로 좌표.
 * @returns 셀 경계에서 반올림하거나 공터 범위로 제한하지 않은 논리 좌표.
 *
 * @remarks 포인터 좌표가 화면 배율을 적용한 전역 좌표라면 먼저 스테이지 컨테이너의 로컬 좌표로 변환해야 한다.
 */
export function screenToGrid(grid: BeltGrid, screenX: number, screenY: number): Point {
  const depth = (screenY - grid.farY) / (grid.nearY - grid.farY);
  const width = grid.farWidth + (grid.nearWidth - grid.farWidth) * depth;
  return new Point(((screenX - grid.centerX) / width + 0.5) * grid.columns, depth * grid.rows);
}

/**
 * 편집 모드에서 한 논리 셀의 원근 사각형을 그릴 꼭짓점을 계산한다.
 *
 * @param grid - 셀을 투영할 벨트 격자 설정.
 * @param x - 셀의 왼쪽 논리 X 좌표.
 * @param y - 셀의 먼 쪽 논리 Y 좌표.
 * @returns PixiJS `Graphics.poly()`에 전달할 시계 방향 좌표 배열.
 */
export function gridCellPolygon(grid: BeltGrid, x: number, y: number): number[] {
  const farLeft = gridToScreen(grid, x, y);
  const farRight = gridToScreen(grid, x + 1, y);
  const nearRight = gridToScreen(grid, x + 1, y + 1);
  const nearLeft = gridToScreen(grid, x, y + 1);
  return [farLeft.x, farLeft.y, farRight.x, farRight.y, nearRight.x, nearRight.y, nearLeft.x, nearLeft.y];
}
