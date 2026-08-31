import type { FurnitureKind } from "./room";

export type ShopItemId =
  | "furniture.sofa"
  | "furniture.table"
  | "furniture.catTower"
  | "furniture.bed"
  | "furniture.desk"
  | "furniture.premiumTower"
  | "decor.plant";

export type ShopItemDefinition = {
  furnitureKind: FurnitureKind;
  price: number;
  currency: "coins" | "gems";
};

export const shopItemDefinitions: Record<ShopItemId, ShopItemDefinition> = {
  "furniture.sofa": { furnitureKind: "sofa", price: 4_800, currency: "coins" },
  "furniture.table": { furnitureKind: "desk", price: 3_200, currency: "coins" },
  "furniture.catTower": { furnitureKind: "catTree", price: 4_200, currency: "coins" },
  "furniture.bed": { furnitureKind: "bed", price: 5_600, currency: "coins" },
  "furniture.desk": { furnitureKind: "desk", price: 3_900, currency: "coins" },
  "furniture.premiumTower": { furnitureKind: "catTree", price: 90, currency: "gems" },
  "decor.plant": { furnitureKind: "plant", price: 1_700, currency: "coins" },
};
