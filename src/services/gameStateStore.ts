import type { GameStateRepository } from "../core/GameClient";
import { type CatVariant, catVariants, DEFAULT_CAT_VARIANT } from "../domain/cats";
import { createDefaultState, type FurnitureKind, type GameState } from "../domain/room";
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
      const saved = JSON.parse(raw) as Partial<GameState>;
      const legacyRewardedQuiz = (saved as Partial<GameState> & { rewardedQuiz?: boolean }).rewardedQuiz;
      const currentEconomy = saved.economyVersion === 2;
      const inventory = readInventory(saved.inventory, fallback.inventory);
      const ownedCats = readOwnedCats(saved.ownedCats);
      const savedActiveCat = readCatVariant(saved.activeCat);
      const activeCat = savedActiveCat && ownedCats.includes(savedActiveCat) ? savedActiveCat : ownedCats[0];
      const homeCats = readHomeCats(saved.homeCats, ownedCats, activeCat);
      return {
        economyVersion: 2,
        coins: typeof saved.coins === "number" ? saved.coins : fallback.coins,
        gems: currentEconomy && typeof saved.gems === "number" ? saved.gems : fallback.gems,
        ownedCats,
        homeCats,
        activeCat,
        completedQuizIds: readCompletedQuizIds(saved.completedQuizIds, legacyRewardedQuiz),
        furniture: Array.isArray(saved.furniture) ? saved.furniture : fallback.furniture,
        inventory,
        shopInventory: readShopInventory(saved.shopInventory, inventory),
      };
    } catch {
      return fallback;
    }
  }

  save(state: GameState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
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
      .filter((itemId) => shopItemDefinitions[itemId].furnitureKind === kind)
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
