import { Graphics, Sprite } from "pixi.js";
import type { ShopItemId } from "../../domain/shop";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import type { BackgroundArtCollection } from "./ForestArt";
import { resolveBackgroundArt } from "./ForestArt";

/**
 * 상점과 보관함에서 실제 장소 이미지를 같은 비율의 썸네일로 만든다.
 *
 * @param art 상품별 배경 텍스처 모음.
 * @param itemId 미리 볼 안정적인 배경 상품 ID.
 * @param width 썸네일의 화면 픽셀 너비.
 * @param height 썸네일의 화면 픽셀 높이.
 * @returns 중앙 anchor와 얇은 테두리를 가진 PixiJS 컨테이너.
 */
export function createBackgroundPreview(
  art: BackgroundArtCollection,
  itemId: ShopItemId,
  width: number,
  height: number,
): Sprite {
  const preview = new Sprite(resolveBackgroundArt(art, itemId));
  applySmoothTextureSampling(preview);
  preview.anchor.set(0.5);
  preview.width = width;
  preview.height = height;
  preview.addChild(
    new Graphics()
      .rect(-preview.texture.width / 2, -preview.texture.height / 2, preview.texture.width, preview.texture.height)
      .stroke({ color: 0x68442f, width: 18 }),
  );
  return preview;
}
