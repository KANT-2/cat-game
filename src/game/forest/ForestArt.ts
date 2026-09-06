import type { Texture } from "pixi.js";
import type { FurnitureKind } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";

export type AnchoredTexture = {
  texture: Texture;
  anchor: { x: number; y: number };
};

export type ForestArt = {
  background: Texture;
  furniture: FurnitureArtCollection;
};

export type FurnitureArtCollection = {
  byKind: Record<FurnitureKind, AnchoredTexture>;
  byShopItem: Partial<Record<ShopItemId, AnchoredTexture>>;
};

/**
 * 배치 데이터에 맞는 가구 이미지를 선택한다.
 *
 * @param art 종류별 이전 이미지와 상품별 실제 이미지 모음.
 * @param kind 상품 ID가 없거나 이미지가 누락됐을 때 사용할 호환 가구 종류.
 * @param shopItemId 저장된 안정적인 상점 상품 ID.
 * @returns 상품별 이미지가 등록되어 있으면 그 이미지를, 아니면 종류별 기본 이미지를 반환한다.
 */
export function resolveFurnitureArt(
  art: FurnitureArtCollection,
  kind: FurnitureKind,
  shopItemId?: ShopItemId,
): AnchoredTexture {
  return (shopItemId ? art.byShopItem[shopItemId] : undefined) ?? art.byKind[kind];
}
