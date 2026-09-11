import type { CatVariant } from "./cats";
import { type ShopItemId, shopItemDefinitions } from "./shop";

export type GachaDrawCount = 1 | 11;
export type GachaRewardId =
  | "cat.ink"
  | "cat.tabby"
  | "cat.silver"
  | "cat.calico"
  | "cat.tuxedo"
  | "cat.fold"
  | ShopItemId;

export type GachaRewardDefinition = {
  id: GachaRewardId;
  weight: number;
  kind: "cat" | "furniture";
  catVariant?: CatVariant;
  shopItemId?: ShopItemId;
};

export const GACHA_SINGLE_COST = 30;
export const GACHA_MULTI_COST = 300;
export const GACHA_DUPLICATE_CAT_COINS = 15;
const furnitureGroups = [
  { weight: 0.1, kinds: ["desk", "hideout"] },
  { weight: 0.25, kinds: ["catTree", "scratcher"] },
  { weight: 0.3, kinds: ["plant"] },
  { weight: 0.26, kinds: ["sofa", "bed", "rug", "litterBox"] },
];

export const gachaRewardDefinitions: readonly GachaRewardDefinition[] = [
  { id: "cat.ink", weight: 0.05, kind: "cat", catVariant: "ink" },
  { id: "cat.silver", weight: 0.01, kind: "cat", catVariant: "silver" },
  { id: "cat.calico", weight: 0.01, kind: "cat", catVariant: "calico" },
  { id: "cat.tuxedo", weight: 0.01, kind: "cat", catVariant: "tuxedo" },
  { id: "cat.fold", weight: 0.01, kind: "cat", catVariant: "fold" },
  ...furnitureGroups.flatMap((group): GachaRewardDefinition[] => {
    const ids = (Object.keys(shopItemDefinitions) as ShopItemId[]).filter((id) => {
      const item = shopItemDefinitions[id];
      return item.kind === "furniture" && group.kinds.includes(item.furnitureKind);
    });
    return ids.map((id) => ({
      id,
      weight: group.weight / ids.length,
      kind: "furniture",
      shopItemId: id,
    }));
  }),
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
