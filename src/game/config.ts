export const BASE_WIDTH = 1600;
export const BASE_HEIGHT = 900;
export const CLEARING_GRID = {
  columns: 10,
  rows: 8,
  centerX: 800,
  farY: 392,
  nearY: 832,
  farWidth: 1240,
  nearWidth: 1560,
} as const;
export const FONT_FAMILY = "Noto Sans KR, Malgun Gothic, sans-serif";

/**
 * 프로젝트 공통 글꼴을 사용하는 PixiJS 텍스트 스타일 속성을 생성한다.
 *
 * @param size - 기준 논리 화면에서 사용할 글꼴 크기.
 * @param color - PixiJS 숫자 색상값. 지정하지 않으면 본문 기본 갈색을 사용한다.
 * @param weight - 프로젝트에서 허용한 글꼴 굵기.
 * @returns `Text` 생성자에 spread할 수 있는 읽기 전용 스타일 속성 객체.
 *
 * @remarks 화면 배율은 텍스트 크기를 직접 변경하지 않고 상위 Canvas 컨테이너에서 처리한다.
 */
export function textStyle(size: number, color = 0x3d2b22, weight: "500" | "600" | "700" | "800" = "600") {
  return { fontFamily: FONT_FAMILY, fontSize: size, fontWeight: weight, fill: color } as const;
}
