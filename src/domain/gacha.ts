import type { CatVariant } from "./cats";
import type { ShopItemId } from "./shop";

export type GachaDrawCount = 1 | 11;
export type GachaRewardId =
  | "cat.ink"
  | "cat.tabby"
  | "furniture.desk"
  | "furniture.catTower"
  | "decor.plant"
  | "furniture.sofa";

export type GachaRewardDefinition = {
  id: GachaRewardId;
  weight: number;
  kind: "cat" | "furniture";
  catVariant?: CatVariant;
  shopItemId?: ShopItemId;
};

export const GACHA_SINGLE_COST = 30;
export const GACHA_MULTI_COST = 270;
export const GACHA_DUPLICATE_CAT_COINS = 15;
export const gachaRewardDefinitions: readonly GachaRewardDefinition[] = [
  { id: "cat.ink", weight: 0.05, kind: "cat", catVariant: "ink" },
  { id: "furniture.desk", weight: 0.1, kind: "furniture", shopItemId: "furniture.desk" },
  {
    id: "furniture.catTower",
    weight: 0.25,
    kind: "furniture",
    shopItemId: "furniture.catTower",
  },
  { id: "decor.plant", weight: 0.3, kind: "furniture", shopItemId: "decor.plant" },
  { id: "furniture.sofa", weight: 0.3, kind: "furniture", shopItemId: "furniture.sofa" },
];

/** 설정된 가중치에 따라 요청한 횟수만큼 독립적인 뽑기 결과를 만든다. */
export function drawGachaRewards(count: GachaDrawCount, random: () => number): GachaRewardDefinition[] {
  return Array.from({ length: count }, () => drawReward(random()));
}

export function gachaCost(count: GachaDrawCount): number {
  return count === 1 ? GACHA_SINGLE_COST : GACHA_MULTI_COST;
}

function drawReward(randomValue: number): GachaRewardDefinition {
  const value = Math.min(Math.max(randomValue, 0), 0.999_999_999);
  let boundary = 0;
  for (const reward of gachaRewardDefinitions) {
    boundary += reward.weight;
    if (value < boundary) {
      return reward;
    }
  }
  return gachaRewardDefinitions[gachaRewardDefinitions.length - 1];
}
