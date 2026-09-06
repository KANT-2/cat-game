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
  rug: "furniture.sofa.cat-rug.01",
  hideout: "furniture.hideout.forest-log.01",
  scratcher: "furniture.cat-tree.leaf-scratcher.01",
  litterBox: "furniture.bed.paw-cushion.01",
};

const SHOP_FURNITURE_ASSET_IDS: Partial<Record<ShopItemId, string>> = {
  "furniture.sofa": "furniture.bench.forest-mushroom.01",
  "furniture.table": "furniture.desk.low-table.01",
  "furniture.catTower": "furniture.cat-tree.leaf-scratcher.01",
  "furniture.bed": "furniture.bed.paw-cushion.01",
  "furniture.desk": "furniture.hideout.forest-log.01",
  "furniture.premiumTower": "furniture.cat-tree.great-tree.01",
  "decor.plant": "furniture.plant.flower-bush.01",
  "decor.reed-clump": "furniture.decor.reed-clump.01",
  "decor.rock-angular": "furniture.decor.rock-angular.01",
  "decor.rock-round": "furniture.decor.rock-round.01",
  "decor.fallen-log": "furniture.decor.fallen-log.01",
  "decor.cardboard-box": "environment.alley.cardboard-box.01",
  "decor.trash-bag": "furniture.decor.alley-trash-bag.01",
  "decor.sealed-box": "furniture.decor.alley-sealed-box.01",
  "decor.plastic-crate": "furniture.decor.alley-plastic-crate.01",
  "decor.alley-food-bowl": "furniture.decor.alley-food-bowl.01",
  "decor.alley-water-bowl": "furniture.decor.alley-water-bowl.01",
  "decor.crushed-can": "furniture.decor.alley-crushed-can.01",
  "decor.old-brick": "furniture.decor.alley-old-brick.01",
  "decor.paper-ball": "furniture.decor.alley-paper-ball.01",
  "decor.plastic-bottle": "furniture.decor.alley-plastic-bottle.01",
  "decor.newspaper-stack": "furniture.decor.alley-newspaper-stack.01",
  "decor.litter-scoop": "furniture.decor.room-litter-scoop.01",
  "decor.yarn-ball": "furniture.decor.room-yarn-ball.01",
  "decor.teaser-set": "furniture.decor.room-teaser-set.01",
  "decor.fur-pile": "furniture.decor.room-fur-pile.01",
  "decor.room-water-bowl": "furniture.decor.room-water-bowl.01",
  "decor.room-food-bowl": "furniture.decor.room-food-bowl.01",
  "furniture.forest.rug": "furniture.forest.rug.01",
  "furniture.forest.cat-tower": "furniture.forest.cat-tower.01",
  "furniture.forest.hideout": "furniture.forest.hideout.01",
  "furniture.forest.scratcher": "furniture.forest.scratcher.01",
  "furniture.forest.litter-box": "furniture.forest.litter-box.01",
  "furniture.forest.rug-2": "furniture.forest.rug.02",
  "furniture.forest.cat-tower-2": "furniture.forest.cat-tower.02",
  "furniture.forest.hideout-2": "furniture.forest.hideout.02",
  "furniture.forest.scratcher-2": "furniture.forest.scratcher.02",
  "furniture.forest.litter-box-2": "furniture.forest.litter-box.02",
  "furniture.forest.bench-2": "furniture.forest.bench.02",
  "furniture.forest.cat-tower-3": "furniture.forest.cat-tower.03",
  "furniture.forest.hideout-3": "furniture.forest.hideout.03",
  "furniture.alley.rug": "furniture.alley.rug.01",
  "furniture.alley.cat-tower": "furniture.alley.cat-tower.01",
  "furniture.alley.hideout": "furniture.alley.hideout.01",
  "furniture.alley.scratcher": "furniture.alley.scratcher.01",
  "furniture.alley.litter-box": "furniture.alley.litter-box.01",
  "furniture.alley.rug-2": "furniture.alley.rug.02",
  "furniture.alley.cat-tower-2": "furniture.alley.cat-tower.02",
  "furniture.alley.hideout-2": "furniture.alley.hideout.02",
  "furniture.alley.scratcher-2": "furniture.alley.scratcher.02",
  "furniture.alley.scratcher-3": "furniture.alley.scratcher.03",
  "furniture.alley.litter-box-2": "furniture.alley.litter-box.02",
  "furniture.alley.litter-box-3": "furniture.alley.litter-box.03",
  "furniture.room.rug": "furniture.room.rug.01",
  "furniture.room.cat-tower": "furniture.room.cat-tower.01",
  "furniture.room.hideout": "furniture.room.hideout.01",
  "furniture.room.scratcher": "furniture.room.scratcher.01",
  "furniture.room.litter-box": "furniture.room.litter-box.01",
  "furniture.room.rug-2": "furniture.room.rug.02",
  "furniture.room.cat-tower-2": "furniture.room.cat-tower.02",
  "furniture.room.cat-tower-3": "furniture.room.cat-tower.03",
  "furniture.room.hideout-2": "furniture.room.hideout.02",
  "furniture.room.scratcher-2": "furniture.room.scratcher.02",
  "furniture.room.litter-box-2": "furniture.room.litter-box.02",
  "furniture.desk-theme.rug": "furniture.desk.rug.01",
  "furniture.desk-theme.cat-tower": "furniture.desk.cat-tower.01",
  "furniture.desk-theme.hideout": "furniture.desk.hideout.01",
  "furniture.desk-theme.scratcher": "furniture.desk.scratcher.01",
  "furniture.desk-theme.litter-box": "furniture.desk.litter-box.01",
  "furniture.desk-theme.rug-2": "furniture.desk.rug.02",
  "furniture.desk-theme.cat-tower-2": "furniture.desk.cat-tower.02",
  "furniture.desk-theme.hideout-2": "furniture.desk.hideout.02",
  "furniture.desk-theme.scratcher-2": "furniture.desk.scratcher.02",
  "furniture.desk-theme.litter-box-2": "furniture.desk.litter-box.02",
  "furniture.ocean.rug": "furniture.ocean.rug.01",
  "furniture.ocean.cat-tower": "furniture.ocean.cat-tower.01",
  "furniture.ocean.hideout": "furniture.ocean.hideout.01",
  "furniture.ocean.scratcher": "furniture.ocean.scratcher.01",
  "furniture.ocean.litter-box": "furniture.ocean.litter-box.01",
  "furniture.ocean.rug-2": "furniture.ocean.rug.02",
  "furniture.ocean.cat-tower-2": "furniture.ocean.cat-tower.02",
  "furniture.ocean.cat-tower-3": "furniture.ocean.cat-tower.03",
  "furniture.ocean.hideout-2": "furniture.ocean.hideout.02",
  "furniture.ocean.scratcher-2": "furniture.ocean.scratcher.02",
  "furniture.ocean.litter-box-2": "furniture.ocean.litter-box.02",
};

const CONSUMABLE_ASSET_IDS: Partial<Record<ShopItemId, string>> = {
  "consumable.salmon-cubes": "consumable.salmon-cubes.01",
  "consumable.chicken-strips": "consumable.chicken-strips.01",
  "consumable.catnip-biscuits": "consumable.catnip-biscuits.01",
  "consumable.tuna-soup": "consumable.tuna-soup.01",
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
  const [backgrounds, sofa, desk, plant, catTree, bed, rug, hideout, scratcher, litterBox, shopFurniture, consumables] =
    await Promise.all([
      loadBackgrounds(catalog, activeBackgroundId),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.sofa),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.desk),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.plant),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.catTree),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.bed),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.rug),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.hideout),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.scratcher),
      loadAnchoredTexture(catalog, FURNITURE_ASSET_IDS.litterBox),
      loadShopFurniture(catalog),
      loadConsumables(catalog),
    ]);
  return {
    backgrounds,
    furniture: {
      byKind: { sofa, desk, plant, catTree, bed, rug, hideout, scratcher, litterBox },
      byShopItem: shopFurniture,
    },
    consumables,
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

async function loadConsumables(
  catalog: AssetCatalogData,
): Promise<Partial<Record<ShopItemId, Awaited<ReturnType<typeof loadTexture>>>>> {
  const entries = await Promise.all(
    Object.entries(CONSUMABLE_ASSET_IDS).map(async ([itemId, assetId]) => [
      itemId,
      await loadTexture(findAssetEntry(catalog, assetId)),
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
