import type { MessageId } from "../../content/messages";
import type { FurnitureKind, GameState } from "../../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../../domain/shop";
import { shopItemNameMessages } from "../shopItemPresentation";

export type OwnedFurnitureEntry = {
  key: string;
  itemId?: ShopItemId;
  kind: FurnitureKind;
  name: MessageId;
  stored: number;
  placed: number;
};

/** 보유 수량과 배치 수량을 실제 상품별 가구 목록으로 합친다. */
export function getOwnedFurnitureEntries(state: GameState): OwnedFurnitureEntry[] {
  const entries: OwnedFurnitureEntry[] = [];
  const itemIds = Object.keys(shopItemDefinitions) as ShopItemId[];
  for (const itemId of itemIds) {
    const definition = shopItemDefinitions[itemId];
    if (definition.kind !== "furniture") {
      continue;
    }
    const stored = state.shopInventory[itemId] ?? 0;
    const placed = state.furniture.filter((item) => item.shopItemId === itemId).length;
    if (stored > 0 || placed > 0) {
      entries.push({
        key: itemId,
        itemId,
        kind: definition.furnitureKind,
        name: shopItemNameMessages[itemId],
        stored,
        placed,
      });
    }
  }

  for (const kind of Object.keys(state.inventory) as FurnitureKind[]) {
    const exactStored = itemIds.reduce((sum, itemId) => {
      const definition = shopItemDefinitions[itemId];
      if (definition.kind !== "furniture" || definition.furnitureKind !== kind) {
        return sum;
      }
      return sum + (state.shopInventory[itemId] ?? 0);
    }, 0);
    const genericStored = Math.max(0, state.inventory[kind] - exactStored);
    const genericPlaced = state.furniture.filter((item) => item.kind === kind && !item.shopItemId).length;
    if (genericStored === 0 && genericPlaced === 0) {
      continue;
    }
    const canonicalId = canonicalProductIds[kind];
    const existing = entries.find((entry) => entry.itemId === canonicalId);
    if (existing) {
      existing.stored += genericStored;
      existing.placed += genericPlaced;
      continue;
    }
    entries.push({
      key: `generic.${kind}`,
      itemId: genericStored > 0 ? canonicalId : undefined,
      kind,
      name: genericProductNameMessages[kind],
      stored: genericStored,
      placed: genericPlaced,
    });
  }
  return entries;
}

const genericProductNameMessages: Record<FurnitureKind, MessageId> = {
  sofa: "shop.productSofa",
  desk: "shop.productDesk",
  plant: "shop.productPlant",
  catTree: "shop.productCatTower",
  bed: "shop.productBed",
  rug: "shop.productForestRug",
  hideout: "shop.productForestHideout",
  scratcher: "shop.productForestScratcher",
  litterBox: "shop.productForestLitterBox",
};

const canonicalProductIds: Record<FurnitureKind, ShopItemId> = {
  sofa: "furniture.sofa",
  desk: "furniture.desk",
  plant: "decor.plant",
  catTree: "furniture.catTower",
  bed: "furniture.bed",
  rug: "furniture.forest.rug",
  hideout: "furniture.forest.hideout",
  scratcher: "furniture.forest.scratcher",
  litterBox: "furniture.forest.litter-box",
};
