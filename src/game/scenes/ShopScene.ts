import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GameState } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import { CanvasButton } from "../components/CanvasButton";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type ShopSceneOptions = { getState: () => GameState; onBack: () => void; onBuy: (itemId: ShopItemId | null) => void };
type CategoryId = "furniture" | "food" | "wallpaper" | "floor" | "decor" | "special";
type TabId = "recommended" | "new" | "popular" | "package";
type ProductKind =
  | "sofa"
  | "table"
  | "catTower"
  | "bed"
  | "food"
  | "wallpaper"
  | "floor"
  | "curtain"
  | "plant"
  | "lamp"
  | "decor"
  | "rug"
  | "package";
type Product = { name: MessageId; price: string; kind: ProductKind; cash?: boolean; itemId?: ShopItemId };

const categories: Array<{ id: CategoryId; label: MessageId }> = [
  { id: "furniture", label: "shop.categoryFurnitureWithTower" },
  { id: "food", label: "shop.categoryFood" },
  { id: "wallpaper", label: "shop.categoryWallpaper" },
  { id: "floor", label: "shop.categoryFloor" },
  { id: "decor", label: "shop.categoryDecor" },
  { id: "special", label: "shop.categorySpecial" },
];

const tabs: Array<{ id: TabId; label: MessageId }> = [
  { id: "recommended", label: "shop.tabRecommended" },
  { id: "new", label: "shop.tabNew" },
  { id: "popular", label: "shop.tabPopular" },
  { id: "package", label: "shop.tabPackage" },
];

const catalog: Record<CategoryId, Product[]> = {
  furniture: [
    { name: "shop.productSofa", price: "4,800", kind: "sofa", itemId: "furniture.sofa" },
    { name: "shop.productTable", price: "3,200", kind: "table", itemId: "furniture.table" },
    { name: "shop.productCatTower", price: "4,200", kind: "catTower", itemId: "furniture.catTower" },
    { name: "shop.productBed", price: "5,600", kind: "bed", itemId: "furniture.bed" },
    { name: "shop.productDesk", price: "3,900", kind: "table", itemId: "furniture.desk" },
    { name: "shop.productPremiumTower", price: "90", kind: "catTower", cash: true, itemId: "furniture.premiumTower" },
  ],
  food: [
    { name: "shop.productFood", price: "1,200", kind: "food" },
    { name: "shop.productWaterBowl", price: "900", kind: "food" },
    { name: "shop.productFishBowl", price: "1,500", kind: "food" },
    { name: "shop.productWoodTray", price: "1,800", kind: "food" },
    { name: "shop.productAutoFeeder", price: "55", kind: "food", cash: true },
    { name: "shop.productPicnicSet", price: "2,400", kind: "food" },
  ],
  wallpaper: [
    { name: "shop.productCreamWall", price: "2,100", kind: "wallpaper" },
    { name: "shop.productCloudWall", price: "2,400", kind: "wallpaper" },
    { name: "shop.productForestWall", price: "2,800", kind: "wallpaper" },
    { name: "shop.productFlowerWall", price: "2,600", kind: "wallpaper" },
    { name: "shop.productNightWall", price: "70", kind: "wallpaper", cash: true },
    { name: "shop.productCatWall", price: "3,000", kind: "wallpaper" },
  ],
  floor: [
    { name: "shop.productOakFloor", price: "2,300", kind: "floor" },
    { name: "shop.productCheckFloor", price: "2,600", kind: "floor" },
    { name: "shop.productStoneFloor", price: "2,800", kind: "floor" },
    { name: "shop.productCreamFloor", price: "2,100", kind: "floor" },
    { name: "shop.productStarFloor", price: "65", kind: "floor", cash: true },
    { name: "shop.productWalnutFloor", price: "3,100", kind: "floor" },
  ],
  decor: [
    { name: "shop.productCurtain", price: "2,100", kind: "curtain" },
    { name: "shop.productPlant", price: "1,700", kind: "plant", itemId: "decor.plant" },
    { name: "shop.productLamp", price: "1,900", kind: "lamp" },
    { name: "shop.productFrame", price: "1,400", kind: "wallpaper" },
    { name: "shop.productBooks", price: "1,600", kind: "decor" },
    { name: "shop.productNeon", price: "75", kind: "lamp", cash: true },
  ],
  special: [
    { name: "shop.productRug", price: "60", kind: "rug", cash: true },
    { name: "shop.productPawCushion", price: "84", kind: "rug", cash: true },
    { name: "shop.productCozyBundle", price: "250", kind: "package", cash: true },
    { name: "shop.productStudyBundle", price: "270", kind: "package", cash: true },
    { name: "shop.productCatBundle", price: "320", kind: "package", cash: true },
    { name: "shop.productDailyBox", price: "30", kind: "package", cash: true },
  ],
};

export class ShopScene extends Container {
  private readonly content = new Container();
  private readonly navigationLayer = new Container();
  private readonly productLayer = new Container();
  private readonly onBuy: (itemId: ShopItemId | null) => void;
  private activeCategory: CategoryId = "furniture";
  private activeTab: TabId = "recommended";

  constructor(options: ShopSceneOptions) {
    super();
    this.onBuy = options.onBuy;
    this.addChild(this.content);
    this.buildBackground();
    this.buildHeader(options);
    this.content.addChild(this.navigationLayer, this.productLayer);
    this.renderNavigation();
    this.renderProducts();
  }

  layout(width: number, height: number): void {
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.content.scale.set(scale);
    this.content.position.set((width - BASE_WIDTH * scale) / 2, (height - BASE_HEIGHT * scale) / 2);
  }

  private buildBackground(): void {
    this.content.addChild(
      new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(0xf8e5c3).rect(0, 790, BASE_WIDTH, 110).fill(0xd8a26b),
    );
  }

  private buildHeader(options: ShopSceneOptions): void {
    const sign = new Graphics()
      .roundRect(48, 24, 340, 98, 18)
      .fill(0xd9a266)
      .stroke({ color: 0x6c4028, width: 5 })
      .moveTo(80, 24)
      .lineTo(80, 0)
      .moveTo(356, 24)
      .lineTo(356, 0)
      .stroke({ color: 0x67402b, width: 7, cap: "round" });
    const title = new Text({ text: message("shop.title"), style: textStyle(40, 0x4a2919, "800") });
    title.anchor.set(0.5);
    title.position.set(218, 73);
    const state = options.getState();
    const currency = new Graphics()
      .roundRect(1030, 22, 520, 62, 25)
      .fill(0xf3d4aa)
      .stroke({ color: 0x70442b, width: 4 });
    const coin = new Graphics().circle(1070, 53, 22).fill(0xf6bd39).stroke({ color: 0xa4601f, width: 4 });
    const cash = new Graphics().roundRect(1320, 34, 52, 38, 7).fill(0x75a844).stroke({ color: 0x365b2b, width: 3 });
    const coins = new Text({ text: state.coins.toLocaleString(), style: textStyle(21, 0x3d2b22, "800") });
    coins.anchor.set(1, 0.5);
    coins.position.set(1288, 53);
    const gems = new Text({ text: String(state.gems), style: textStyle(21, 0x3d2b22, "800") });
    gems.anchor.set(1, 0.5);
    gems.position.set(1515, 53);
    const back = new CanvasButton({
      label: message("shop.back"),
      width: 112,
      height: 58,
      color: 0xf3bd79,
      onPress: options.onBack,
    });
    back.position.set(36, 820);
    this.content.addChild(sign, title, currency, coin, cash, coins, gems, back);
  }

  private renderNavigation(): void {
    this.clearLayer(this.navigationLayer);
    this.navigationLayer.addChild(
      new Graphics().roundRect(55, 145, 255, 575, 20).fill(0xf6dcb7).stroke({ color: 0x9a623b, width: 4 }),
    );
    categories.forEach((category, index) => {
      const active = category.id === this.activeCategory;
      const button = new CanvasButton({
        label: message(category.label),
        width: 225,
        height: 68,
        color: active ? 0xffc466 : 0xffedd0,
        onPress: () => this.selectCategory(category.id),
      });
      button.position.set(70, 165 + index * 84);
      this.navigationLayer.addChild(button);
    });
    tabs.forEach((tab, index) => {
      const active = tab.id === this.activeTab;
      const button = new CanvasButton({
        label: message(tab.label),
        width: 210,
        height: 58,
        color: active ? 0xffc45f : 0xd9ad7d,
        onPress: () => this.selectTab(tab.id),
      });
      button.position.set(390 + index * 225, 820);
      this.navigationLayer.addChild(button);
    });
  }

  private renderProducts(): void {
    this.clearLayer(this.productLayer);
    const category = categories.find((item) => item.id === this.activeCategory);
    const tab = tabs.find((item) => item.id === this.activeTab);
    if (!category || !tab) {
      return;
    }
    const headingPanel = new Graphics()
      .roundRect(330, 145, 1215, 105, 20)
      .fill(0xfff4dc)
      .stroke({ color: 0xa96d43, width: 4 });
    const title = new Text({
      text: message("shop.viewTitle", { category: message(category.label), tab: message(tab.label) }),
      style: textStyle(28, 0x493022, "800"),
    });
    title.position.set(370, 168);
    const description = new Text({
      text: message(tabDescription(this.activeTab)),
      style: textStyle(17, 0x76533c, "600"),
    });
    description.position.set(370, 211);
    this.productLayer.addChild(headingPanel, title, description);
    this.productsForView().forEach((product, index) => {
      this.buildProductCard(product, index);
    });
  }

  private productsForView(): Product[] {
    const source = catalog[this.activeCategory];
    if (this.activeTab === "new") {
      return [...source.slice(2), ...source.slice(0, 2)];
    }
    if (this.activeTab === "popular") {
      return [...source].reverse();
    }
    if (this.activeTab === "package") {
      return packageProducts();
    }
    return source;
  }

  private buildProductCard(product: Product, index: number): void {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 330 + column * 405;
    const y = 270 + row * 255;
    const card = new Graphics().roundRect(x, y, 380, 230, 18).fill(0xfff5e1).stroke({ color: 0xb77a4f, width: 3 });
    const badgeId = tabBadge(this.activeTab);
    const badge = new Graphics()
      .roundRect(x + 15, y + 15, 74, 28, 10)
      .fill(this.activeTab === "package" ? 0x9b78a8 : 0xe98a48);
    const badgeText = new Text({ text: message(badgeId), style: textStyle(13, 0xffffff, "800") });
    badgeText.anchor.set(0.5);
    badgeText.position.set(x + 52, y + 29);
    const name = new Text({ text: message(product.name), style: textStyle(18, 0x3d2b22, "800") });
    name.anchor.set(0.5);
    name.position.set(x + 190, y + 37);
    const art = drawProduct(product.kind, index);
    art.position.set(x + 120, y + 128);
    const price = new Text({
      text: message(product.cash ? "shop.cashPrice" : "shop.coinPrice", { amount: product.price }),
      style: textStyle(18, product.cash ? 0x4e7a32 : 0x8b571e, "800"),
    });
    price.anchor.set(0.5);
    price.position.set(x + 265, y + 113);
    const buy = new CanvasButton({
      label: message("shop.buy"),
      width: 140,
      height: 46,
      color: 0x91aa55,
      onPress: () => this.onBuy(product.itemId ?? null),
    });
    buy.position.set(x + 195, y + 145);
    this.productLayer.addChild(card, badge, badgeText, name, art, price, buy);
  }

  private selectCategory(category: CategoryId): void {
    if (category === this.activeCategory) {
      return;
    }
    this.activeCategory = category;
    this.renderNavigation();
    this.renderProducts();
  }
  private selectTab(tab: TabId): void {
    if (tab === this.activeTab) {
      return;
    }
    this.activeTab = tab;
    this.renderNavigation();
    this.renderProducts();
  }
  private clearLayer(layer: Container): void {
    layer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
  }
}

function tabDescription(tab: TabId): MessageId {
  if (tab === "new") {
    return "shop.newDescription";
  }
  if (tab === "popular") {
    return "shop.popularDescription";
  }
  if (tab === "package") {
    return "shop.packageDescription";
  }
  return "shop.recommendedDescription";
}

function tabBadge(tab: TabId): MessageId {
  if (tab === "new") {
    return "shop.badgeNew";
  }
  if (tab === "popular") {
    return "shop.badgeHot";
  }
  if (tab === "package") {
    return "shop.badgePackage";
  }
  return "shop.badgePick";
}

function packageProducts(): Product[] {
  const names: MessageId[] = [
    "shop.packageStarter",
    "shop.packageCozy",
    "shop.packagePremium",
    "shop.packageDaily",
    "shop.packageValue",
    "shop.packageComplete",
  ];
  return names.map((name, index) => ({ name, price: String(120 + index * 35), kind: "package", cash: true }));
}

function drawProduct(kind: ProductKind, variant: number): Graphics {
  const art = new Graphics();
  const accent = [0xa96340, 0xc59055, 0x7c9a67, 0xd29668, 0x8fa9bf, 0xc68573][variant % 6];
  if (kind === "sofa" || kind === "bed") {
    return art
      .roundRect(-70, -35, 140, 70, 15)
      .fill(accent)
      .stroke({ color: 0x543426, width: 4 })
      .roundRect(-55, 10, 110, 45, 8)
      .fill(0xe4bd91)
      .stroke({ color: 0x543426, width: 4 });
  }
  if (kind === "table") {
    return art
      .ellipse(0, -8, 75, 38)
      .fill(accent)
      .stroke({ color: 0x543426, width: 4 })
      .rect(-48, 18, 9, 45)
      .rect(39, 18, 9, 45)
      .fill(0x70442e);
  }
  if (kind === "catTower") {
    return art
      .roundRect(-48, 5, 96, 65, 7)
      .fill(0xc59055)
      .stroke({ color: 0x543426, width: 4 })
      .rect(-8, -68, 16, 78)
      .fill(0xd8b77c)
      .stroke({ color: 0x543426, width: 3 })
      .ellipse(0, -68, 42, 15)
      .fill(0xd89b58)
      .stroke({ color: 0x543426, width: 3 });
  }
  if (kind === "food") {
    return art
      .ellipse(-28, 15, 53, 27)
      .fill(0xd3b189)
      .stroke({ color: 0x543426, width: 4 })
      .ellipse(38, 22, 38, 20)
      .fill(accent)
      .stroke({ color: 0x543426, width: 4 });
  }
  if (kind === "wallpaper") {
    return art
      .roundRect(-68, -62, 136, 124, 8)
      .fill(accent)
      .stroke({ color: 0x543426, width: 4 })
      .moveTo(-55, 25)
      .bezierCurveTo(-20, -25, 18, 55, 55, -15)
      .stroke({ color: 0xffefd0, width: 10 });
  }
  if (kind === "floor") {
    return art
      .poly([-75, 0, 0, -42, 75, 0, 0, 42])
      .fill(accent)
      .stroke({ color: 0x543426, width: 4 })
      .moveTo(-37, -20)
      .lineTo(37, 20)
      .moveTo(-37, 20)
      .lineTo(37, -20)
      .stroke({ color: 0xf3d3a9, width: 3 });
  }
  if (kind === "curtain") {
    return art
      .rect(-55, -55, 110, 105)
      .fill(0xaed6df)
      .stroke({ color: 0x543426, width: 4 })
      .moveTo(-55, -55)
      .bezierCurveTo(-60, -20, -48, 20, -60, 54)
      .moveTo(55, -55)
      .bezierCurveTo(60, -20, 48, 20, 60, 54)
      .stroke({ color: 0xf1d7a8, width: 18 });
  }
  if (kind === "plant") {
    return art
      .roundRect(-28, 20, 56, 43, 10)
      .fill(0xc8895b)
      .stroke({ color: 0x543426, width: 4 })
      .ellipse(-18, -14, 20, 46)
      .ellipse(15, -25, 19, 52)
      .ellipse(2, -4, 18, 45)
      .fill(0x76965b)
      .stroke({ color: 0x47633b, width: 3 });
  }
  if (kind === "lamp") {
    return art
      .poly([-45, 12, 45, 12, 28, -45, -28, -45])
      .fill(0xf2d394)
      .stroke({ color: 0x543426, width: 4 })
      .rect(-5, 12, 10, 45)
      .fill(0x70442e)
      .ellipse(0, 58, 33, 10)
      .fill(0x9a603c);
  }
  if (kind === "decor") {
    return art
      .rect(-58, -18, 25, 75)
      .rect(-28, -42, 28, 99)
      .rect(6, -5, 26, 62)
      .rect(38, -30, 24, 87)
      .fill(accent)
      .stroke({ color: 0x543426, width: 3 });
  }
  if (kind === "rug") {
    return art
      .circle(0, 4, 62)
      .fill(0xf1c892)
      .stroke({ color: 0x9c6645, width: 4 })
      .circle(0, 10, 25)
      .fill(0xe5a173)
      .circle(-32, -18, 11)
      .circle(0, -33, 11)
      .circle(32, -18, 11)
      .fill(0xe5a173);
  }
  return art
    .roundRect(-65, -48, 130, 96, 16)
    .fill(accent)
    .stroke({ color: 0x543426, width: 4 })
    .moveTo(-65, -12)
    .lineTo(65, -12)
    .moveTo(0, -48)
    .lineTo(0, 48)
    .stroke({ color: 0xffd66e, width: 10 })
    .circle(0, -50, 18)
    .fill(0xe87657);
}
