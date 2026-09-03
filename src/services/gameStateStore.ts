import type { GameStateRepository } from "../core/GameClient";
import { type CatVariant, catVariants, DEFAULT_CAT_VARIANT } from "../domain/cats";
import { type DailyQuestId, dailyQuestDefinitions } from "../domain/dailyQuest";
import { createDefaultState, type FurnitureKind, type GameSettings, type GameState } from "../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../domain/shop";

const SAVE_KEY = "cozy-code-cat-room-v1";

export class GameStateStore implements GameStateRepository {
  load(): GameState {
    const fallback = createDefaultState();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return fallback;
      }
      const saved = JSON.parse(raw) as Omit<Partial<GameState>, "economyVersion"> & {
        economyVersion?: number;
        gems?: unknown;
        rewardedQuiz?: boolean;
      };
      const legacyRewardedQuiz = saved.rewardedQuiz;
      const inventory = readInventory(saved.inventory, fallback.inventory);
      const ownedCats = readOwnedCats(saved.ownedCats);
      const savedActiveCat = readCatVariant(saved.activeCat);
      const activeCat = savedActiveCat && ownedCats.includes(savedActiveCat) ? savedActiveCat : ownedCats[0];
      const homeCats = readHomeCats(saved.homeCats, ownedCats, activeCat);
      return {
        economyVersion: 3,
        coins: readUnifiedCoins(saved, fallback.coins),
        ownedCats,
        homeCats,
        activeCat,
        completedQuizIds: readCompletedQuizIds(saved.completedQuizIds, legacyRewardedQuiz),
        completedCodeChallengeIds: readStringIds(saved.completedCodeChallengeIds),
        dailyQuestDate: typeof saved.dailyQuestDate === "string" ? saved.dailyQuestDate : "",
        dailyCompletedTaskIds: readStringIds(saved.dailyCompletedTaskIds),
        claimedDailyQuestIds: readDailyQuestIds(saved.claimedDailyQuestIds),
        dailyBonusClaimed: saved.dailyBonusClaimed === true,
        gachaPityCount: readCount(saved.gachaPityCount, 0),
        catMemories: readCatMemories(saved.catMemories),
        settings: readSettings(saved.settings, fallback.settings),
        furniture: Array.isArray(saved.furniture) ? saved.furniture : fallback.furniture,
        inventory,
        shopInventory: readShopInventory(saved.shopInventory, inventory),
        activeWallpaper: readActiveTheme(saved.activeWallpaper, "wallpaper"),
        activeFloor: readActiveTheme(saved.activeFloor, "floor"),
      };
    } catch {
      return fallback;
    }
  }

  save(state: GameState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
}

function readUnifiedCoins(
  saved: Omit<Partial<GameState>, "economyVersion"> & { economyVersion?: number; gems?: unknown },
  fallback: number,
): number {
  if (saved.economyVersion === 3) {
    return readCount(saved.coins, fallback);
  }
  const legacyCoins = readCount(saved.coins, 0);
  const legacyGems = saved.economyVersion === 2 ? readCount(saved.gems, 100_000) : 100_000;
  return legacyCoins + legacyGems;
}

function readOwnedCats(value: unknown): CatVariant[] {
  const owned = Array.isArray(value) ? value.filter((item): item is CatVariant => readCatVariant(item) !== null) : [];
  const migrated = new Set<CatVariant>(owned.length > 0 ? owned : [DEFAULT_CAT_VARIANT]);
  migrated.add("siamese");
  return [...migrated];
}

function readCatVariant(value: unknown): CatVariant | null {
  return typeof value === "string" && catVariants.includes(value as CatVariant) ? (value as CatVariant) : null;
}

function readHomeCats(value: unknown, ownedCats: CatVariant[], activeCat: CatVariant): CatVariant[] {
  if (!Array.isArray(value)) {
    return [activeCat];
  }
  const visible = value.filter(
    (item): item is CatVariant => readCatVariant(item) !== null && ownedCats.includes(item as CatVariant),
  );
  return [...new Set(visible)];
}

function readShopInventory(
  value: unknown,
  inventoryByKind: Record<FurnitureKind, number>,
): Partial<Record<ShopItemId, number>> {
  const saved = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const inventory: Partial<Record<ShopItemId, number>> = {};
  for (const itemId of Object.keys(shopItemDefinitions) as ShopItemId[]) {
    const count = readCount(saved[itemId], 0);
    if (count > 0) {
      inventory[itemId] = count;
    }
  }
  const canonicalProducts: Record<FurnitureKind, ShopItemId> = {
    sofa: "furniture.sofa",
    desk: "furniture.desk",
    plant: "decor.plant",
    catTree: "furniture.catTower",
    bed: "furniture.bed",
  };
  for (const kind of Object.keys(canonicalProducts) as FurnitureKind[]) {
    const exactCount = (Object.keys(shopItemDefinitions) as ShopItemId[])
      .filter((itemId) => {
        const item = shopItemDefinitions[itemId];
        return item.kind === "furniture" && item.furnitureKind === kind;
      })
      .reduce((sum, itemId) => sum + (inventory[itemId] ?? 0), 0);
    const residualCount = Math.max(0, inventoryByKind[kind] - exactCount);
    if (residualCount > 0) {
      const canonicalId = canonicalProducts[kind];
      inventory[canonicalId] = (inventory[canonicalId] ?? 0) + residualCount;
    }
  }
  return inventory;
}

function readInventory(value: unknown, fallback: Record<FurnitureKind, number>): Record<FurnitureKind, number> {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }
  const saved = value as Partial<Record<FurnitureKind, unknown>>;
  return {
    sofa: readCount(saved.sofa, fallback.sofa),
    desk: readCount(saved.desk, fallback.desk),
    plant: readCount(saved.plant, fallback.plant),
    catTree: readCount(saved.catTree, fallback.catTree),
    bed: readCount(saved.bed, fallback.bed),
  };
}

function readCount(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readCompletedQuizIds(value: unknown, legacyRewardedQuiz: boolean | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === "string");
  }
  if (legacyRewardedQuiz === true) {
    return ["python-range-001"];
  }
  return [];
}

function readActiveTheme(value: unknown, kind: "wallpaper" | "floor"): ShopItemId | null {
  if (typeof value !== "string" || !(value in shopItemDefinitions)) {
    return null;
  }
  const itemId = value as ShopItemId;
  return shopItemDefinitions[itemId].kind === kind ? itemId : null;
}

function readStringIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
}

function readDailyQuestIds(value: unknown): DailyQuestId[] {
  const validIds = new Set(dailyQuestDefinitions.map((quest) => quest.id));
  return readStringIds(value).filter((id): id is DailyQuestId => validIds.has(id as DailyQuestId));
}

function readCatMemories(value: unknown): Partial<Record<CatVariant, string[]>> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const saved = value as Record<string, unknown>;
  const memories: Partial<Record<CatVariant, string[]>> = {};
  for (const variant of catVariants) {
    const entries = readStringIds(saved[variant]).slice(0, 100);
    if (entries.length > 0) {
      memories[variant] = entries;
    }
  }
  return memories;
}

function readSettings(value: unknown, fallback: GameSettings): GameSettings {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }
  const saved = value as Partial<Record<keyof GameSettings, unknown>>;
  return {
    bgmEnabled: typeof saved.bgmEnabled === "boolean" ? saved.bgmEnabled : fallback.bgmEnabled,
    bgmVolume: readPercent(saved.bgmVolume, fallback.bgmVolume),
    effectsEnabled: typeof saved.effectsEnabled === "boolean" ? saved.effectsEnabled : fallback.effectsEnabled,
    effectsVolume: readPercent(saved.effectsVolume, fallback.effectsVolume),
    reducedMotion: typeof saved.reducedMotion === "boolean" ? saved.reducedMotion : fallback.reducedMotion,
  };
}

function readPercent(value: unknown, fallback: number): number {
  return typeof value === "number" && value >= 0 && value <= 100 ? Math.round(value) : fallback;
}
