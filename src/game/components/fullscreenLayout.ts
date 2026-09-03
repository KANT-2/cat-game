import type { Container } from "pixi.js";
import { BASE_HEIGHT, BASE_WIDTH } from "../config";

/**
 * 1600×900 논리 장면을 실제 Canvas 크기에 맞춰 빈 영역 없이 채운다.
 *
 * @param content - 기준 좌표계로 제작된 장면 컨테이너.
 * @param width - 현재 Canvas의 CSS 픽셀 너비.
 * @param height - 현재 Canvas의 CSS 픽셀 높이.
 * @remarks 가로형 PWA에서 전체 UI를 보존하기 위해 축마다 배율을 적용하며 위치는 좌상단에 고정한다.
 */
export function layoutToFillViewport(content: Container, width: number, height: number): void {
  content.scale.set(width / BASE_WIDTH, height / BASE_HEIGHT);
  content.position.set(0, 0);
}
