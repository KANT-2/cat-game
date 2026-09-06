import { Container, Graphics, Sprite, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GameState } from "../../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../../domain/shop";
import { BackButton } from "../components/BackButton";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPageBackground, createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { createCoinAmount, createCoinIcon, createCurrencyBar } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import { createBackgroundPreview } from "../forest/BackgroundPreview";
import type { BackgroundArtCollection, ForestArt, FurnitureArtCollection } from "../forest/ForestArt";
import { resolveFurnitureArt } from "../forest/ForestArt";
import { createFurniturePreview } from "../forest/FurniturePreview";
import { shopItemNameMessages } from "../shopItemPresentation";

type ShopSceneOptions = {
  getState: () => GameState;
  onBack: () => void;
  onBuy: (itemId: ShopItemId) => void;
  heroArt: string;
  backIcon: string;
  coinIcon: string;
  furnitureArt: FurnitureArtCollection;
  backgroundArt: BackgroundArtCollection;
  consumableArt: ForestArt["consumables"];
};
type CategoryId = "furniture" | "consumable" | "wallpaper" | "decor";
type ThemeId = "all" | "forest" | "alley" | "room" | "desk" | "ocean";
type ProductKind =
  | "sofa"
  | "table"
  | "catTower"
  | "bed"
  | "wallpaper"
  | "curtain"
  | "plant"
  | "lamp"
  | "decor"
  | "rug"
  | "consumable"
  | "package";
type Product = { kind: ProductKind; itemId: ShopItemId };

const categories: Array<{ id: CategoryId; label: MessageId }> = [
  { id: "furniture", label: "shop.categoryFurnitureWithTower" },
  { id: "consumable", label: "shop.categoryConsumable" },
  { id: "wallpaper", label: "shop.categoryWallpaper" },
  { id: "decor", label: "shop.categoryDecor" },
];

const themeLabels: Record<ThemeId, MessageId> = {
  all: "shop.filterAll",
  forest: "shop.filterForest",
  alley: "shop.filterAlley",
  room: "shop.filterRoom",
  desk: "shop.filterDesk",
  ocean: "shop.filterOcean",
};

const categoryThemes: Record<CategoryId, ThemeId[]> = {
  furniture: ["all", "forest", "alley", "room", "desk", "ocean"],
  consumable: ["all"],
  wallpaper: ["all", "forest", "alley", "room", "desk", "ocean"],
  decor: ["all", "forest", "alley", "room"],
};

const catalog: Record<CategoryId, Product[]> = {
  furniture: [
    { kind: "sofa", itemId: "furniture.sofa" },
    { kind: "table", itemId: "furniture.table" },
    { kind: "catTower", itemId: "furniture.catTower" },
    { kind: "bed", itemId: "furniture.bed" },
    { kind: "table", itemId: "furniture.desk" },
    { kind: "catTower", itemId: "furniture.premiumTower" },
    { kind: "rug", itemId: "furniture.forest.rug" },
    { kind: "catTower", itemId: "furniture.forest.cat-tower" },
    { kind: "bed", itemId: "furniture.forest.hideout" },
    { kind: "catTower", itemId: "furniture.forest.scratcher" },
    { kind: "bed", itemId: "furniture.forest.litter-box" },
    { kind: "rug", itemId: "furniture.forest.rug-2" },
    { kind: "catTower", itemId: "furniture.forest.cat-tower-2" },
    { kind: "bed", itemId: "furniture.forest.hideout-2" },
    { kind: "catTower", itemId: "furniture.forest.scratcher-2" },
    { kind: "bed", itemId: "furniture.forest.litter-box-2" },
    { kind: "sofa", itemId: "furniture.forest.bench-2" },
    { kind: "catTower", itemId: "furniture.forest.cat-tower-3" },
    { kind: "bed", itemId: "furniture.forest.hideout-3" },
    { kind: "rug", itemId: "furniture.alley.rug" },
    { kind: "catTower", itemId: "furniture.alley.cat-tower" },
    { kind: "bed", itemId: "furniture.alley.hideout" },
    { kind: "catTower", itemId: "furniture.alley.scratcher" },
    { kind: "bed", itemId: "furniture.alley.litter-box" },
    { kind: "rug", itemId: "furniture.alley.rug-2" },
    { kind: "catTower", itemId: "furniture.alley.cat-tower-2" },
    { kind: "bed", itemId: "furniture.alley.hideout-2" },
    { kind: "catTower", itemId: "furniture.alley.scratcher-2" },
    { kind: "catTower", itemId: "furniture.alley.scratcher-3" },
    { kind: "bed", itemId: "furniture.alley.litter-box-2" },
    { kind: "bed", itemId: "furniture.alley.litter-box-3" },
    { kind: "rug", itemId: "furniture.room.rug" },
    { kind: "catTower", itemId: "furniture.room.cat-tower" },
    { kind: "bed", itemId: "furniture.room.hideout" },
    { kind: "catTower", itemId: "furniture.room.scratcher" },
    { kind: "bed", itemId: "furniture.room.litter-box" },
    { kind: "rug", itemId: "furniture.room.rug-2" },
    { kind: "catTower", itemId: "furniture.room.cat-tower-2" },
    { kind: "catTower", itemId: "furniture.room.cat-tower-3" },
    { kind: "bed", itemId: "furniture.room.hideout-2" },
    { kind: "catTower", itemId: "furniture.room.scratcher-2" },
    { kind: "bed", itemId: "furniture.room.litter-box-2" },
    { kind: "rug", itemId: "furniture.desk-theme.rug" },
    { kind: "catTower", itemId: "furniture.desk-theme.cat-tower" },
    { kind: "bed", itemId: "furniture.desk-theme.hideout" },
    { kind: "catTower", itemId: "furniture.desk-theme.scratcher" },
    { kind: "bed", itemId: "furniture.desk-theme.litter-box" },
    { kind: "rug", itemId: "furniture.desk-theme.rug-2" },
    { kind: "catTower", itemId: "furniture.desk-theme.cat-tower-2" },
    { kind: "bed", itemId: "furniture.desk-theme.hideout-2" },
    { kind: "catTower", itemId: "furniture.desk-theme.scratcher-2" },
    { kind: "bed", itemId: "furniture.desk-theme.litter-box-2" },
    { kind: "rug", itemId: "furniture.ocean.rug" },
    { kind: "catTower", itemId: "furniture.ocean.cat-tower" },
    { kind: "bed", itemId: "furniture.ocean.hideout" },
    { kind: "catTower", itemId: "furniture.ocean.scratcher" },
    { kind: "bed", itemId: "furniture.ocean.litter-box" },
    { kind: "rug", itemId: "furniture.ocean.rug-2" },
    { kind: "catTower", itemId: "furniture.ocean.cat-tower-2" },
    { kind: "catTower", itemId: "furniture.ocean.cat-tower-3" },
    { kind: "bed", itemId: "furniture.ocean.hideout-2" },
    { kind: "catTower", itemId: "furniture.ocean.scratcher-2" },
    { kind: "bed", itemId: "furniture.ocean.litter-box-2" },
  ],
  consumable: [
    { kind: "consumable", itemId: "consumable.salmon-cubes" },
    { kind: "consumable", itemId: "consumable.chicken-strips" },
    { kind: "consumable", itemId: "consumable.catnip-biscuits" },
    { kind: "consumable", itemId: "consumable.tuna-soup" },
  ],
  wallpaper: [
    { kind: "wallpaper", itemId: "wallpaper.cream" },
    { kind: "wallpaper", itemId: "wallpaper.cloud" },
    { kind: "wallpaper", itemId: "wallpaper.forest" },
    { kind: "wallpaper", itemId: "wallpaper.flower" },
    { kind: "wallpaper", itemId: "wallpaper.night" },
    { kind: "wallpaper", itemId: "wallpaper.cat" },
    { kind: "wallpaper", itemId: "wallpaper.modernAlley" },
    { kind: "wallpaper", itemId: "wallpaper.villageAlley" },
    { kind: "wallpaper", itemId: "wallpaper.sunnyStudio" },
    { kind: "wallpaper", itemId: "wallpaper.livingRoom" },
    { kind: "wallpaper", itemId: "wallpaper.cityOffice" },
    { kind: "wallpaper", itemId: "wallpaper.botanicalDesk" },
    { kind: "wallpaper", itemId: "wallpaper.musicDesk" },
    { kind: "wallpaper", itemId: "wallpaper.sandyCove" },
    { kind: "wallpaper", itemId: "wallpaper.seasidePromenade" },
    { kind: "wallpaper", itemId: "wallpaper.workingHarbor" },
  ],
  decor: [
    { kind: "plant", itemId: "decor.plant" },
    { kind: "plant", itemId: "decor.reed-clump" },
    { kind: "decor", itemId: "decor.rock-angular" },
    { kind: "decor", itemId: "decor.rock-round" },
    { kind: "decor", itemId: "decor.fallen-log" },
    { kind: "package", itemId: "decor.cardboard-box" },
    { kind: "package", itemId: "decor.trash-bag" },
    { kind: "package", itemId: "decor.sealed-box" },
    { kind: "package", itemId: "decor.plastic-crate" },
    { kind: "plant", itemId: "decor.alley-food-bowl" },
    { kind: "plant", itemId: "decor.alley-water-bowl" },
    { kind: "decor", itemId: "decor.crushed-can" },
    { kind: "decor", itemId: "decor.old-brick" },
    { kind: "decor", itemId: "decor.paper-ball" },
    { kind: "decor", itemId: "decor.plastic-bottle" },
    { kind: "decor", itemId: "decor.newspaper-stack" },
    { kind: "decor", itemId: "decor.litter-scoop" },
    { kind: "decor", itemId: "decor.yarn-ball" },
    { kind: "decor", itemId: "decor.teaser-set" },
    { kind: "decor", itemId: "decor.fur-pile" },
    { kind: "plant", itemId: "decor.room-water-bowl" },
    { kind: "plant", itemId: "decor.room-food-bowl" },
  ],
};

export class ShopScene extends Container {
  private readonly content = new Container();
  private readonly navigationLayer = new Container();
  private readonly productLayer = new Container();
  private readonly modalLayer = new Container();
  private readonly onBuy: (itemId: ShopItemId) => void;
  private readonly getState: () => GameState;
  private readonly onBack: () => void;
  private readonly heroArt: string;
  private readonly backIcon: string;
  private readonly coinIcon: string;
  private readonly furnitureArt: FurnitureArtCollection;
  private readonly backgroundArt: BackgroundArtCollection;
  private readonly consumableArt: ForestArt["consumables"];
  private readonly headerLayer = new Container();
  private activeCategory: CategoryId = "furniture";
  private activeTheme: ThemeId = "all";
  private activePage = 0;

  constructor(options: ShopSceneOptions) {
    super();
    this.onBuy = options.onBuy;
    this.getState = options.getState;
    this.onBack = options.onBack;
    this.heroArt = options.heroArt;
    this.backIcon = options.backIcon;
    this.coinIcon = options.coinIcon;
    this.furnitureArt = options.furnitureArt;
    this.backgroundArt = options.backgroundArt;
    this.consumableArt = options.consumableArt;
    this.addChild(this.content);
    this.buildBackground();
    this.content.addChild(this.headerLayer, this.navigationLayer, this.productLayer, this.modalLayer);
    this.buildHeader();
    this.renderNavigation();
    this.renderProducts();
  }

  /** 구매 직후 재화와 보유 수량을 현재 상태로 다시 그린다. */
  refresh(): void {
    this.buildHeader();
    this.renderProducts();
  }

  layout(width: number, height: number): void {
    layoutToFillViewport(this.content, width, height);
  }

  private buildBackground(): void {
    this.content.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT));
  }

  private buildHeader(): void {
    this.clearLayer(this.headerLayer);
    const sign = new Graphics()
      .roundRect(126, 31, 270, 98, 18)
      .fill({ color: 0x4a2919, alpha: 0.25 })
      .roundRect(122, 24, 270, 98, 18)
      .fill(0xd9a266)
      .stroke({ color: 0x6c4028, width: 5 })
      .roundRect(132, 34, 250, 78, 13)
      .stroke({ color: 0xffdaa1, width: 2, alpha: 0.72 })
      .moveTo(150, 24)
      .lineTo(150, 0)
      .moveTo(364, 24)
      .lineTo(364, 0)
      .stroke({ color: 0x67402b, width: 7, cap: "round" });
    const title = new Text({ text: message("shop.title"), style: textStyle(40, 0x4a2919, "800") });
    title.anchor.set(0.5);
    title.position.set(257, 73);
    const ornament = createTitleOrnament(192, 102, 130);
    const state = this.getState();
    const currency = createCurrencyBar(this.coinIcon, state.coins);
    currency.container.position.set(1230, 22);
    const back = new BackButton({ iconSrc: this.backIcon, size: 72, onPress: this.onBack });
    back.position.set(24, 20);
    this.headerLayer.addChild(sign, title, ornament, currency.container, back);
  }

  private renderNavigation(): void {
    this.clearLayer(this.navigationLayer);
    this.navigationLayer.addChild(createCozyPanel(55, 145, 255, 470, { fill: 0xf6dcb7, border: 0x9a623b }));
    categories.forEach((category, index) => {
      const active = category.id === this.activeCategory;
      const button = new CanvasButton({
        label: message(category.label),
        width: 225,
        height: 68,
        color: active ? 0xffc466 : 0xffedd0,
        onPress: () => this.selectCategory(category.id),
      });
      button.position.set(70, 165 + index * 96);
      this.navigationLayer.addChild(button);
    });
  }

  private renderProducts(): void {
    this.clearLayer(this.productLayer);
    const category = categories.find((item) => item.id === this.activeCategory);
    if (!category) {
      return;
    }
    const products = this.filteredProductsForView();
    const themeLabel = message(themeLabels[this.activeTheme]);
    const headingPanel = createCozyPanel(330, 145, 1215, 190, { fill: 0xfff4dc, border: 0xa96d43 });
    const title = new Text({
      text: message("shop.collectionTitle", { category: message(category.label), theme: themeLabel }),
      style: textStyle(28, 0x493022, "800"),
    });
    title.position.set(370, 168);
    const description = new Text({
      text: message(this.activeTheme === "all" ? "shop.allProductsDescription" : "shop.themeProductsDescription", {
        count: products.length,
        theme: themeLabel,
      }),
      style: textStyle(17, 0x76533c, "600"),
    });
    description.position.set(370, 211);
    const heroFrame = createCozyPanel(1115, 157, 405, 165, { fill: 0x5a321f, border: 0x8f5836, radius: 18 });
    const hero = Sprite.from(this.heroArt);
    applySmoothTextureSampling(hero);
    hero.anchor.set(0.5);
    hero.position.set(1318, 240);
    hero.width = 245;
    hero.height = 164;
    const featured = new Text({ text: message("shop.badgePick"), style: textStyle(14, 0xffe9b2, "800") });
    featured.position.set(1138, 175);
    this.productLayer.addChild(headingPanel, title, description, heroFrame, hero, featured);
    this.buildThemeFilters();
    this.productsForPage(products).forEach((product, index) => {
      this.buildProductCard(product, index);
    });
    this.renderPageControls(products.length);
  }

  private productsForPage(products: Product[]): Product[] {
    const start = this.activePage * PRODUCTS_PER_PAGE;
    return products.slice(start, start + PRODUCTS_PER_PAGE);
  }

  private filteredProductsForView(): Product[] {
    if (this.activeTheme === "all") {
      return catalog[this.activeCategory];
    }
    return catalog[this.activeCategory].filter((product) => productTheme(product.itemId) === this.activeTheme);
  }

  private buildThemeFilters(): void {
    const themes = categoryThemes[this.activeCategory];
    if (themes.length <= 1) {
      return;
    }
    themes.forEach((theme, index) => {
      const active = theme === this.activeTheme;
      const button = new CanvasButton({
        label: message(themeLabels[theme]),
        width: 106,
        height: 42,
        fontSize: 14,
        color: active ? 0xe99b45 : 0xe6cfaf,
        textColor: active ? 0xffffff : 0x493022,
        onPress: () => this.selectTheme(theme),
      });
      button.position.set(370 + index * 116, 267);
      this.productLayer.addChild(button);
    });
  }

  private renderPageControls(productCount: number): void {
    const pageCount = Math.ceil(productCount / PRODUCTS_PER_PAGE);
    if (pageCount <= 1) {
      return;
    }
    const previous = new CanvasButton({
      label: message("shop.previousPage"),
      width: 92,
      height: 38,
      fontSize: 14,
      color: this.activePage > 0 ? 0xd9ad7d : 0xcbbca9,
      onPress: () => this.changePage(-1, pageCount),
    });
    previous.position.set(770, 805);
    const page = new Text({
      text: message("shop.pageIndicator", { current: this.activePage + 1, total: pageCount }),
      style: textStyle(15, 0x604637, "800"),
    });
    page.anchor.set(0.5);
    page.position.set(1000, 824);
    const next = new CanvasButton({
      label: message("shop.nextPage"),
      width: 92,
      height: 38,
      fontSize: 14,
      color: this.activePage < pageCount - 1 ? 0xd9ad7d : 0xcbbca9,
      onPress: () => this.changePage(1, pageCount),
    });
    next.position.set(1110, 805);
    this.productLayer.addChild(previous, page, next);
  }

  private changePage(offset: number, pageCount: number): void {
    const nextPage = Math.max(0, Math.min(pageCount - 1, this.activePage + offset));
    if (nextPage === this.activePage) {
      return;
    }
    this.activePage = nextPage;
    this.renderProducts();
  }

  private buildProductCard(product: Product, index: number): void {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 330 + column * 405;
    const y = 355 + row * 210;
    const card = createCozyPanel(x, y, 380, 195, { fill: 0xfff5e1, border: 0xb77a4f, radius: 18 });
    const theme = productTheme(product.itemId);
    const badgeLabel = theme ? themeLabels[theme] : categories.find((item) => item.id === this.activeCategory)?.label;
    const badge = new Graphics().roundRect(x + 15, y + 15, 74, 28, 10).fill(0xe98a48);
    const badgeText = new Text({
      text: badgeLabel ? message(badgeLabel) : "",
      style: textStyle(13, 0xffffff, "800"),
    });
    badgeText.anchor.set(0.5);
    badgeText.position.set(x + 52, y + 29);
    const name = new Text({
      text: message(shopItemNameMessages[product.itemId]),
      style: textStyle(17, 0x3d2b22, "800"),
    });
    name.anchor.set(0.5);
    name.position.set(x + 275, y + 38);
    const definition = shopItemDefinitions[product.itemId];
    const art = this.createProductArt(product, index);
    art.position.set(x + 105, y + 112);
    const price = createCoinAmount(this.coinIcon, definition.price, {
      color: 0x8b571e,
      fontSize: 18,
      iconSize: 24,
      gap: 10,
    });
    price.position.set(x + 275 - price.width / 2, y + 82);
    const ownedCount = this.getState().shopInventory[product.itemId] ?? 0;
    const owned = new Text({
      text: message("shop.ownedCount", { count: ownedCount }),
      style: textStyle(14, 0x6f7652, "700"),
    });
    owned.anchor.set(0.5);
    owned.position.set(x + 275, y + 112);
    const buy = new CanvasButton({
      label: message("shop.buy"),
      width: 140,
      height: 46,
      color: 0x91aa55,
      onPress: () => this.showPurchaseConfirmation(product),
    });
    buy.position.set(x + 205, y + 133);
    this.productLayer.addChild(card, badge, badgeText, name, art, price, owned, buy);
  }

  private createProductArt(product: Product, index: number): Container {
    const definition = shopItemDefinitions[product.itemId];
    if (definition.kind === "furniture") {
      return createFurniturePreview(
        resolveFurnitureArt(this.furnitureArt, definition.furnitureKind, product.itemId),
        155,
        122,
      );
    }
    if (definition.kind === "wallpaper") {
      return createBackgroundPreview(this.backgroundArt, product.itemId, 155, 94);
    }
    if (definition.kind === "consumable") {
      const texture = this.consumableArt[product.itemId];
      if (texture) {
        const sprite = new Sprite(texture);
        applySmoothTextureSampling(sprite);
        sprite.anchor.set(0.5);
        const scale = Math.min(155 / texture.width, 112 / texture.height);
        sprite.scale.set(scale);
        return sprite;
      }
    }
    const art = drawProduct(product.kind, index);
    art.scale.set(0.74);
    return art;
  }

  private showPurchaseConfirmation(product: Product): void {
    this.closePurchaseConfirmation();
    const blocker = new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill({ color: 0x2f211b, alpha: 0.58 });
    blocker.eventMode = "static";
    const panel = createCozyPanel(420, 205, 760, 490, { fill: 0xfff5df, border: 0x87502e, radius: 32 });
    const coin = createCoinIcon(this.coinIcon, 72);
    coin.position.set(764, 250);
    const title = new Text({
      text: message("shop.confirmTitle", { item: message(shopItemNameMessages[product.itemId]) }),
      style: { ...textStyle(30, 0x4b3021, "800"), align: "center", wordWrap: true, wordWrapWidth: 650 },
    });
    title.anchor.set(0.5, 0);
    title.position.set(800, 355);
    const detail = new Text({
      text: message("shop.confirmDetail", { amount: shopItemDefinitions[product.itemId].price.toLocaleString() }),
      style: { ...textStyle(18, 0x6b4935, "600"), align: "center", wordWrap: true, wordWrapWidth: 620, lineHeight: 29 },
    });
    detail.anchor.set(0.5, 0);
    detail.position.set(800, 430);
    const cancel = new CanvasButton({
      label: message("shop.cancel"),
      width: 190,
      height: 60,
      fontSize: 19,
      color: 0xd8bea0,
      onPress: () => this.closePurchaseConfirmation(),
    });
    cancel.position.set(555, 560);
    const confirm = new CanvasButton({
      label: message("shop.confirmPurchase"),
      width: 190,
      height: 60,
      fontSize: 19,
      color: 0xf2aa4d,
      onPress: () => {
        this.closePurchaseConfirmation();
        this.onBuy(product.itemId);
      },
    });
    confirm.position.set(855, 560);
    this.modalLayer.addChild(blocker, panel, coin, title, detail, cancel, confirm);
  }

  private closePurchaseConfirmation(): void {
    this.clearLayer(this.modalLayer);
  }

  private selectCategory(category: CategoryId): void {
    if (category === this.activeCategory) {
      return;
    }
    this.activeCategory = category;
    this.activeTheme = "all";
    this.activePage = 0;
    this.renderNavigation();
    this.renderProducts();
    if (category === "wallpaper") {
      this.preloadBackgroundProducts();
    }
  }
  private selectTheme(theme: ThemeId): void {
    if (theme === this.activeTheme) {
      return;
    }
    this.activeTheme = theme;
    this.activePage = 0;
    this.renderProducts();
  }

  private preloadBackgroundProducts(): void {
    const itemIds = catalog.wallpaper.map((product) => product.itemId);
    void this.backgroundArt
      .load(itemIds)
      .then(() => {
        if (!this.destroyed && this.activeCategory === "wallpaper") {
          this.renderProducts();
        }
      })
      .catch((error: unknown) => {
        console.warn("Background shop previews could not be loaded", error);
      });
  }
  private clearLayer(layer: Container): void {
    layer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
  }
}

const PRODUCTS_PER_PAGE = 6;

const wallpaperThemes: Partial<Record<ShopItemId, Exclude<ThemeId, "all">>> = {
  "wallpaper.cream": "forest",
  "wallpaper.cloud": "forest",
  "wallpaper.forest": "forest",
  "wallpaper.flower": "alley",
  "wallpaper.modernAlley": "alley",
  "wallpaper.villageAlley": "alley",
  "wallpaper.cat": "room",
  "wallpaper.sunnyStudio": "room",
  "wallpaper.livingRoom": "room",
  "wallpaper.cityOffice": "room",
  "wallpaper.night": "desk",
  "wallpaper.botanicalDesk": "desk",
  "wallpaper.musicDesk": "desk",
  "wallpaper.sandyCove": "ocean",
  "wallpaper.seasidePromenade": "ocean",
  "wallpaper.workingHarbor": "ocean",
};

const forestDecor = new Set<ShopItemId>([
  "decor.plant",
  "decor.reed-clump",
  "decor.rock-angular",
  "decor.rock-round",
  "decor.fallen-log",
]);
const roomDecor = new Set<ShopItemId>([
  "decor.litter-scoop",
  "decor.yarn-ball",
  "decor.teaser-set",
  "decor.fur-pile",
  "decor.room-water-bowl",
  "decor.room-food-bowl",
]);

function productTheme(itemId: ShopItemId): Exclude<ThemeId, "all"> | null {
  const wallpaperTheme = wallpaperThemes[itemId];
  if (wallpaperTheme) {
    return wallpaperTheme;
  }
  if (itemId.startsWith("furniture.alley.")) {
    return "alley";
  }
  if (itemId.startsWith("furniture.room.")) {
    return "room";
  }
  if (itemId.startsWith("furniture.desk-theme.")) {
    return "desk";
  }
  if (itemId.startsWith("furniture.ocean.")) {
    return "ocean";
  }
  if (itemId.startsWith("furniture.")) {
    return "forest";
  }
  if (forestDecor.has(itemId)) {
    return "forest";
  }
  if (roomDecor.has(itemId)) {
    return "room";
  }
  if (itemId.startsWith("decor.")) {
    return "alley";
  }
  return null;
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
  if (kind === "wallpaper") {
    return art
      .roundRect(-68, -62, 136, 124, 8)
      .fill(accent)
      .stroke({ color: 0x543426, width: 4 })
      .moveTo(-55, 25)
      .bezierCurveTo(-20, -25, 18, 55, 55, -15)
      .stroke({ color: 0xffefd0, width: 10 });
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
