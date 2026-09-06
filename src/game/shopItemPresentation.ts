import type { MessageId } from "../content/messages";
import type { ShopItemId } from "../domain/shop";

export const shopItemNameMessages: Record<ShopItemId, MessageId> = {
  "furniture.sofa": "shop.productSofa",
  "furniture.table": "shop.productTable",
  "furniture.catTower": "shop.productCatTower",
  "furniture.bed": "shop.productBed",
  "furniture.desk": "shop.productDesk",
  "furniture.premiumTower": "shop.productPremiumTower",
  "decor.plant": "shop.productPlant",
  "wallpaper.cream": "shop.productCreamWall",
  "wallpaper.cloud": "shop.productCloudWall",
  "wallpaper.forest": "shop.productForestWall",
  "wallpaper.flower": "shop.productFlowerWall",
  "wallpaper.night": "shop.productNightWall",
  "wallpaper.cat": "shop.productCatWall",
  "floor.oak": "shop.productOakFloor",
  "floor.check": "shop.productCheckFloor",
  "floor.stone": "shop.productStoneFloor",
  "floor.cream": "shop.productCreamFloor",
  "floor.star": "shop.productStarFloor",
  "floor.walnut": "shop.productWalnutFloor",
};
