import type { Sprite } from "pixi.js";

/**
 * 큰 PNG를 HUD 크기로 축소할 때 밉맵을 사용해 고주파 디테일과 알파 가장자리의 계단 현상을 줄인다.
 *
 * @param sprite - 정적 래스터 텍스처를 사용하는 PixiJS 스프라이트.
 * @remarks 텍스처 소스의 샘플링 설정을 변경하므로 같은 소스를 공유하는 모든 스프라이트에 적용된다.
 */
export function applySmoothTextureSampling(sprite: Sprite): void {
  const source = sprite.texture.source;
  source.scaleMode = "linear";
  source.autoGenerateMipmaps = true;
  source.updateMipmaps();
}
