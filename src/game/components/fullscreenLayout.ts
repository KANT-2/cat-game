import type { Container } from "pixi.js";
import { BASE_HEIGHT, BASE_WIDTH } from "../config";

/**
 * 1600×900 논리 장면을 실제 Canvas의 중앙 안전 영역에 배치한다.
 *
 * @param content - 기준 좌표계로 제작된 장면 컨테이너.
 * @param width - 현재 Canvas의 CSS 픽셀 너비.
 * @param height - 현재 Canvas의 CSS 픽셀 높이.
 * @remarks 작은 화면에서는 잘리지 않도록 같은 비율로 축소하지만 원본 크기 이상으로 확대하지 않는다.
 * 배경은 각 장면의 바깥 레이어가 Canvas 전체를 채우며, 이 컨테이너의 아이콘과 글자는 크기를 유지한다.
 */
export function layoutToFillViewport(content: Container, width: number, height: number): void {
  const scale = Math.min(1, width / BASE_WIDTH, height / BASE_HEIGHT);
  content.scale.set(scale);
  content.position.set((width - BASE_WIDTH * scale) / 2, (height - BASE_HEIGHT * scale) / 2);
}
