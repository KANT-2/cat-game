import type { AssetCatalogData } from "../assets/AssetCatalog";
import { findAssetEntry, loadTexture } from "../assets/SpriteSheetLoader";
import type { FurnitureKind } from "../domain/room";
import type { ShopItemId } from "../domain/shop";
import type { AnchoredTexture, BackgroundArtCollection, ForestArt } from "../game/forest/ForestArt";

const BACKGROUND_ASSET_IDS: Record<Extract<ShopItemId, `wallpaper.${string}`>, string> = {
  "wallpaper.cream": "background.forest.clearing-day.01",
  "wallpaper.cloud": "background.forest.clearing-sunny.01",
  "wallpaper.forest": "background.forest.waterfall-day.01",
  "wallpaper.flower": "background.alley.stone-courtyard.01",
  "wallpaper.night": "background.desk.executive.01",
  "wallpaper.cat": "background.room.cottage.01",
  "wallpaper.modernAlley": "background.alley.modern-courtyard.01",
  "wallpaper.villageAlley": "background.alley.village-yard.01",
  "wallpaper.sunnyStudio": "background.room.sunny-studio.01",
  "wallpaper.livingRoom": "background.room.living-room.01",
  "wallpaper.cityOffice": "background.room.city-office.01",
  "wallpaper.botanicalDesk": "background.desk.botanical.01",
  "wallpaper.musicDesk": "background.desk.music.01",
  "wallpaper.sandyCove": "background.ocean.sandy-cove.01",
  "wallpaper.seasidePromenade": "background.ocean.seaside-promenade.01",
  "wallpaper.workingHarbor": "background.ocean.working-harbor.01",
};

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
 * @param activeBackgroundId - 첫 화면에서 즉시 필요한 저장된 배경 상품 ID.
 * @returns 배경 텍스처와 바닥 접점 anchor가 보장된 가구별 텍스처.
 * @throws 가구 항목에 anchor가 없거나 필요한 ID가 카탈로그에 없으면 오류를 던진다.
 *
 * @remarks 파일 경로는 이 모듈에 두지 않으며, 기본·적용 중 배경만 먼저 읽고 나머지는 상점 진입 때
 * 지연 로드한다. 데스크톱 위젯 모드에서는 호출하지 않는다.
 */
export async function loadForestArt(
  catalog: AssetCatalogData,
  activeBackgroundId?: ShopItemId | null,
): Promise<ForestArt> {
  const [backgrounds, sofa, desk, plant, catTree, bed, shopFurniture] = await Promise.all([
    loadBackgrounds(catalog, activeBackgroundId),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.sofa),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.desk),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.plant),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.catTree),
    loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.bed),
    loadShopFurniture(catalog),
  ]);
  return {
    backgrounds,
    furniture: {
      byKind: { sofa, desk, plant, catTree, bed },
      byShopItem: shopFurniture,
    },
  };
}

async function loadBackgrounds(
  catalog: AssetCatalogData,
  activeBackgroundId?: ShopItemId | null,
): Promise<BackgroundArtCollection> {
  const byShopItem: Partial<Record<ShopItemId, Awaited<ReturnType<typeof loadTexture>>>> = {};
  const inFlight = new Map<ShopItemId, Promise<void>>();
  const load = async (itemIds: readonly ShopItemId[]): Promise<void> => {
    await Promise.all(
      itemIds.map((itemId) => {
        const assetId = BACKGROUND_ASSET_IDS[itemId as keyof typeof BACKGROUND_ASSET_IDS];
        if (!assetId || byShopItem[itemId]) {
          return Promise.resolve();
        }
        const current = inFlight.get(itemId);
        if (current) {
          return current;
        }
        const pending = loadTexture(findAssetEntry(catalog, assetId))
          .then((texture) => {
            byShopItem[itemId] = texture;
          })
          .finally(() => {
            inFlight.delete(itemId);
          });
        inFlight.set(itemId, pending);
        return pending;
      }),
    );
  };
  const initiallyRequired: ShopItemId[] = ["wallpaper.cream"];
  if (activeBackgroundId && activeBackgroundId !== "wallpaper.cream") {
    initiallyRequired.push(activeBackgroundId);
  }
  await load(initiallyRequired);
  const defaultBackground = byShopItem["wallpaper.cream"];
  if (!defaultBackground) {
    throw new Error("Default background texture was not loaded");
  }
  return { default: defaultBackground, byShopItem, load };
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
