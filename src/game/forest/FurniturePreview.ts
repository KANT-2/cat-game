import { Sprite } from "pixi.js";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import type { AnchoredTexture } from "./ForestArt";

/**
 * 실제 가구 텍스처로 UI용 미리보기 스프라이트를 만든다.
 *
 * @param art 카탈로그에서 불러온 가구 텍스처와 바닥 기준 anchor.
 * @param maxWidth 미리보기 영역의 최대 논리 픽셀 너비.
 * @param maxHeight 미리보기 영역의 최대 논리 픽셀 높이.
 * @returns 원본 비율을 유지하며 지정 영역 안에 들어오는 중앙 anchor 스프라이트.
 */
export function createFurniturePreview(art: AnchoredTexture, maxWidth: number, maxHeight: number): Sprite {
  const sprite = new Sprite(art.texture);
  applySmoothTextureSampling(sprite);
  sprite.anchor.set(0.5);
  const scale = Math.min(maxWidth / sprite.texture.width, maxHeight / sprite.texture.height);
  sprite.scale.set(scale);
  return sprite;
}
