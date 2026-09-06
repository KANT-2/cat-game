import type { Texture } from "pixi.js";
import type { FurnitureKind } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";

export type AnchoredTexture = {
  texture: Texture;
  anchor: { x: number; y: number };
};

export type ForestArt = {
  backgrounds: BackgroundArtCollection;
  furniture: FurnitureArtCollection;
  consumables: Partial<Record<ShopItemId, Texture>>;
};

export type BackgroundArtCollection = {
  default: Texture;
  byShopItem: Partial<Record<ShopItemId, Texture>>;
  /**
   * 지정한 상품의 배경 텍스처를 카탈로그 경로에서 불러와 공유 캐시에 추가한다.
   *
   * @param itemIds 상점 또는 보관함 화면에서 곧 표시하거나 적용할 배경 상품 ID 목록.
   * @returns 모든 요청 이미지가 준비되면 완료되는 Promise. 이미 로드된 이미지는 다시 요청하지 않는다.
   * @remarks 로드가 끝나면 `byShopItem`을 갱신한다. 가격이나 보유 여부는 판정하지 않는다.
   */
  load(itemIds: readonly ShopItemId[]): Promise<void>;
};

export type FurnitureArtCollection = {
  byKind: Record<FurnitureKind, AnchoredTexture>;
  byShopItem: Partial<Record<ShopItemId, AnchoredTexture>>;
};

/**
 * 선택된 배경 상품에 대응하는 장소 이미지를 반환한다.
 *
 * @param art 기본 장소와 상품별 배경 텍스처 모음.
 * @param shopItemId 저장된 배경 상품 ID. 선택하지 않은 상태에서는 생략한다.
 * @returns 상품 이미지가 등록되어 있으면 해당 텍스처를, 아니면 기본 숲 배경을 반환한다.
 */
export function resolveBackgroundArt(art: BackgroundArtCollection, shopItemId?: ShopItemId | null): Texture {
  return (shopItemId ? art.byShopItem[shopItemId] : undefined) ?? art.default;
}

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
