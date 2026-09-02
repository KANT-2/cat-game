import type { CatVariant } from "./cats";
import type { ShopItemId } from "./shop";

export type GachaRarity = "N" | "R" | "SR" | "SSR";
export type GachaDrawCount = 1 | 11;
export type GachaRewardId = "cat.ink" | "furniture.desk" | "furniture.catTower" | "decor.plant" | "furniture.sofa";

export type GachaRewardDefinition = {
  id: GachaRewardId;
  rarity: GachaRarity;
  weight: number;
  kind: "cat" | "furniture";
  catVariant?: CatVariant;
  shopItemId?: ShopItemId;
};

export const GACHA_SINGLE_COST = 30;
export const GACHA_MULTI_COST = 270;
export const GACHA_DUPLICATE_CAT_GEMS = 15;

export const gachaRewardDefinitions: readonly GachaRewardDefinition[] = [
  { id: "cat.ink", rarity: "SSR", weight: 0.05, kind: "cat", catVariant: "ink" },
  { id: "furniture.desk", rarity: "SR", weight: 0.1, kind: "furniture", shopItemId: "furniture.desk" },
  {
    id: "furniture.catTower",
    rarity: "R",
    weight: 0.25,
    kind: "furniture",
    shopItemId: "furniture.catTower",
  },
  { id: "decor.plant", rarity: "N", weight: 0.3, kind: "furniture", shopItemId: "decor.plant" },
  { id: "furniture.sofa", rarity: "N", weight: 0.3, kind: "furniture", shopItemId: "furniture.sofa" },
];

const guaranteedReward = gachaRewardDefinitions.find((reward) => reward.rarity === "SR");

/** 공개된 가중치와 10+1회의 SR 이상 보장 규칙으로 가챠 결과를 만든다. */
export function drawGachaRewards(count: GachaDrawCount, random: () => number): GachaRewardDefinition[] {
  const rewards = Array.from({ length: count }, () => drawReward(random()));
  if (count === 11 && !rewards.some((reward) => reward.rarity === "SR" || reward.rarity === "SSR")) {
    if (!guaranteedReward) {
      throw new Error("Gacha guarantee reward is missing");
    }
    rewards[rewards.length - 1] = guaranteedReward;
  }
  return rewards;
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
