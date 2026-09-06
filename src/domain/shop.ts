import type { FurnitureKind } from "./room";

export type ShopItemId =
  | "furniture.sofa"
  | "furniture.table"
  | "furniture.catTower"
  | "furniture.bed"
  | "furniture.desk"
  | "furniture.premiumTower"
  | "decor.plant"
  | "wallpaper.cream"
  | "wallpaper.cloud"
  | "wallpaper.forest"
  | "wallpaper.flower"
  | "wallpaper.night"
  | "wallpaper.cat"
  | "wallpaper.modernAlley"
  | "wallpaper.villageAlley"
  | "wallpaper.sunnyStudio"
  | "wallpaper.livingRoom"
  | "wallpaper.cityOffice"
  | "wallpaper.botanicalDesk"
  | "wallpaper.musicDesk"
  | "wallpaper.sandyCove"
  | "wallpaper.seasidePromenade"
  | "wallpaper.workingHarbor"
  | "floor.oak"
  | "floor.check"
  | "floor.stone"
  | "floor.cream"
  | "floor.star"
  | "floor.walnut";

type Price = { price: number };

export type ShopItemDefinition =
  | (Price & { kind: "furniture"; furnitureKind: FurnitureKind })
  | (Price & { kind: "wallpaper" | "floor"; themeColor: number });

export const shopItemDefinitions: Record<ShopItemId, ShopItemDefinition> = {
  "furniture.sofa": { kind: "furniture", furnitureKind: "sofa", price: 4_800 },
  "furniture.table": { kind: "furniture", furnitureKind: "desk", price: 3_200 },
  "furniture.catTower": { kind: "furniture", furnitureKind: "catTree", price: 4_200 },
  "furniture.bed": { kind: "furniture", furnitureKind: "bed", price: 5_600 },
  "furniture.desk": { kind: "furniture", furnitureKind: "desk", price: 3_900 },
  "furniture.premiumTower": { kind: "furniture", furnitureKind: "catTree", price: 90 },
  "decor.plant": { kind: "furniture", furnitureKind: "plant", price: 1_700 },
  "wallpaper.cream": { kind: "wallpaper", themeColor: 0xf7e7cb, price: 2_100 },
  "wallpaper.cloud": { kind: "wallpaper", themeColor: 0xdcecf1, price: 2_400 },
  "wallpaper.forest": { kind: "wallpaper", themeColor: 0xdde7cf, price: 2_800 },
  "wallpaper.flower": { kind: "wallpaper", themeColor: 0xf1d7d7, price: 2_600 },
  "wallpaper.night": { kind: "wallpaper", themeColor: 0x5d657c, price: 70 },
  "wallpaper.cat": { kind: "wallpaper", themeColor: 0xf3d5aa, price: 3_000 },
  "wallpaper.modernAlley": { kind: "wallpaper", themeColor: 0xbfc7c5, price: 2_900 },
  "wallpaper.villageAlley": { kind: "wallpaper", themeColor: 0xb8aa94, price: 3_100 },
  "wallpaper.sunnyStudio": { kind: "wallpaper", themeColor: 0xe6d4b4, price: 3_200 },
  "wallpaper.livingRoom": { kind: "wallpaper", themeColor: 0xd9bd91, price: 3_400 },
  "wallpaper.cityOffice": { kind: "wallpaper", themeColor: 0xb9c4c8, price: 3_600 },
  "wallpaper.botanicalDesk": { kind: "wallpaper", themeColor: 0xd7b27d, price: 2_700 },
  "wallpaper.musicDesk": { kind: "wallpaper", themeColor: 0xd8c4a1, price: 3_000 },
  "wallpaper.sandyCove": { kind: "wallpaper", themeColor: 0xe9d2a3, price: 3_300 },
  "wallpaper.seasidePromenade": { kind: "wallpaper", themeColor: 0xb7d9e5, price: 3_500 },
  "wallpaper.workingHarbor": { kind: "wallpaper", themeColor: 0x9fbbc4, price: 3_800 },
  "floor.oak": { kind: "floor", themeColor: 0xb98355, price: 2_300 },
  "floor.check": { kind: "floor", themeColor: 0xd3a582, price: 2_600 },
  "floor.stone": { kind: "floor", themeColor: 0x98998d, price: 2_800 },
  "floor.cream": { kind: "floor", themeColor: 0xe8c99c, price: 2_100 },
  "floor.star": { kind: "floor", themeColor: 0x6f7390, price: 65 },
  "floor.walnut": { kind: "floor", themeColor: 0x815737, price: 3_100 },
};
