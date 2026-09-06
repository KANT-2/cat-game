import type { AssetCatalogData } from "../assets/AssetCatalog";
import { findAssetEntry, loadTexture } from "../assets/SpriteSheetLoader";
import type { FurnitureKind } from "../domain/room";
import type { ShopItemId } from "../domain/shop";
import type { AnchoredTexture, ForestArt } from "../game/forest/ForestArt";

const FURNITURE_ASSET_IDS: Record<FurnitureKind, string> = {
  sofa: "furniture.sofa.cat-rug.01",
  desk: "furniture.desk.low-table.01",
  plant: "furniture.plant.flower-bush.01",
  catTree: "furniture.cat-tree.scratch-post.01",
  bed: "furniture.bed.paw-cushion.01",
};

const SHOP_FURNITURE_ASSET_IDS: Partial<Record<ShopItemId, string>> = {
  "furniture.sofa": "furniture.bench.forest-mushroom.01",
  "furniture.table": "furniture.desk.low-table.01",
  "furniture.catTower": "furniture.cat-tree.leaf-scratcher.01",
  "furniture.bed": "furniture.bed.paw-cushion.01",
  "furniture.desk": "furniture.hideout.forest-log.01",
  "furniture.premiumTower": "furniture.cat-tree.great-tree.01",
  "decor.plant": "furniture.plant.flower-bush.01",
};

/**
 * 홈 공터의 배경과 배치 가구 텍스처를 카탈로그 ID로 불러온다.
 *
 * @param catalog - 앱 시작 시 검증한 전체 리소스 카탈로그.
 * @returns 배경 텍스처와 바닥 접점 anchor가 보장된 가구별 텍스처.
 * @throws 가구 항목에 anchor가 없거나 필요한 ID가 카탈로그에 없으면 오류를 던진다.
 *
 * @remarks 파일 경로는 이 모듈에 두지 않으며, 데스크톱 위젯 모드에서는 호출하지 않는다.
 */
export async function loadForestArt(catalog: AssetCatalogData): Promise<ForestArt> {
  const background = await loadTexture(findAssetEntry(catalog, "background.forest.clearing-day.01"));
  const [sofa, desk, plant, catTree, bed, shopFurniture] = await Promise.all([
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.sofa),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.desk),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.plant),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.catTree),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.bed),
    loadShopFurniture(catalog),
  ]);
  return {
    background,
    furniture: {
      byKind: { sofa, desk, plant, catTree, bed },
      byShopItem: shopFurniture,
    },
  };
}

async function loadShopFurniture(catalog: AssetCatalogData): Promise<Partial<Record<ShopItemId, AnchoredTexture>>> {
  const entries = await Promise.all(
    Object.entries(SHOP_FURNITURE_ASSET_IDS).map(async ([itemId, assetId]) => [
      itemId,
      await loadAnchoredTexture(catalog, assetId),
    ]),
  );
  return Object.fromEntries(entries);
}

async function loadAnchoredTexture(catalog: AssetCatalogData, assetId: string): Promise<AnchoredTexture> {
  const entry = findAssetEntry(catalog, assetId);
  if (!entry.anchor) {
    throw new Error(`Furniture asset anchor is missing: ${assetId}`);
  }
  return {
    texture: await loadTexture(entry),
    anchor: entry.anchor,
  };
}
