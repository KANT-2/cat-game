import { AnimatedSprite } from "pixi.js";
import type { LoadedSpriteSheet } from "../../assets/SpriteSheetLoader";

/**
 * 고양이의 현재 실루엣을 바닥 방향으로 눌러 투영한 그림자를 만든다.
 *
 * @param clip - 그림자 형태와 바닥 anchor를 가져올 고양이 애니메이션 클립.
 * @param displayScale - 원본 고양이 스프라이트에 적용한 화면 배율.
 * @returns 실제 스프라이트와 프레임 번호를 동기화해 사용할 검은 AnimatedSprite.
 * @remarks 세로 크기를 강하게 압축하고 비스듬히 기울인 표현이며 충돌이나 이동 판정에는 사용하지 않는다.
 */
export function createCatGroundShadow(clip: LoadedSpriteSheet, displayScale: number): AnimatedSprite {
  const shadow = new AnimatedSprite({ textures: clip.textures, autoPlay: false });
  shadow.tint = 0x000000;
  shadow.alpha = 0.2;
  shadow.eventMode = "none";
  setCatGroundShadowClip(shadow, clip);
  resizeCatGroundShadow(shadow, displayScale);
  return shadow;
}

/**
 * 투영 그림자가 사용하는 프레임 목록과 anchor를 새 동작 클립으로 바꾼다.
 *
 * @param shadow - `createCatGroundShadow`가 만든 투영 그림자.
 * @param clip - 실제 고양이가 전환할 새 애니메이션 클립.
 */
export function setCatGroundShadowClip(shadow: AnimatedSprite, clip: LoadedSpriteSheet): void {
  shadow.textures = clip.textures;
  shadow.anchor.set(clip.anchor.x, clip.anchor.y);
  shadow.gotoAndStop(0);
}

/**
 * 실제 고양이의 표시 배율에 맞춰 바로 위 햇빛이 만든 그림자를 바닥면에 눕힌다.
 *
 * @param shadow - 크기를 바꿀 투영 그림자.
 * @param displayScale - 실제 고양이 스프라이트가 사용하는 균일 배율.
 * @remarks 햇빛이 고양이 바로 위에 있으므로 사선으로 기울이지 않고 바닥 깊이 방향으로만 압축한다.
 */
export function resizeCatGroundShadow(shadow: AnimatedSprite, displayScale: number): void {
  shadow.rotation = 0;
  shadow.skew.set(0, 0);
  shadow.scale.set(displayScale * 0.84, displayScale * 0.2);
  shadow.position.set(0, 3);
}
