import { Container, Graphics, Sprite, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { Awaitable, LearningResetResult } from "../../core/GameClient";
import { catVariants, type CatVariant } from "../../domain/cats";
import type { FurnitureKind, GameSettings, GameState } from "../../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../../domain/shop";
import { BackButton } from "../components/BackButton";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPanel } from "../components/CozyGameUi";
import { createCurrencyBar } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import { textStyle } from "../config";
import type { CatAnimationLibrary } from "../entities/CatAnimations";
import { createBackgroundPreview } from "../forest/BackgroundPreview";
import type { BackgroundArtCollection, ForestArt, FurnitureArtCollection } from "../forest/ForestArt";
import { resolveFurnitureArt } from "../forest/ForestArt";
import { createFurniturePreview } from "../forest/FurniturePreview";
import { getOwnedFurnitureEntries } from "../presentation/ownedFurniture";
import { shopItemNameMessages } from "../shopItemPresentation";
import { SettingsPage } from "./SettingsPage";

export type FeaturePageKind = "profile" | "settings" | "owned" | "collection" | "addFriend" | "visitGarden";

type Options = {
  kind: FeaturePageKind;
  getState: () => GameState;
  onClose: () => void;
  onNavigate: (kind: FeaturePageKind) => void;
  onPlaceOwned: (itemId: ShopItemId | undefined, kind: FurnitureKind) => void;
  onSelectCat: (variant: CatVariant) => Awaitable<boolean>;
  onSetCatHome: (variant: CatVariant, visible: boolean) => Awaitable<boolean>;
  onApplyTheme: (itemId: ShopItemId | null) => Awaitable<boolean>;
  onUseConsumable: (itemId: ShopItemId, catVariant: CatVariant) => Awaitable<boolean>;
  onEnterRoomEdit: () => void;
  onOpenAttendance: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => Awaitable<GameSettings>;
  onResetLearning: () => Awaitable<LearningResetResult>;
  onLogout: (() => Awaitable<boolean>) | null;
  catAnimations: CatAnimationLibrary;
  backIcon: string;
  coinIcon: string;
  furnitureArt: FurnitureArtCollection;
  consumableArt: ForestArt["consumables"];
  backgroundArt: BackgroundArtCollection;
};
/** 설정·보유·친구 기능을 전체 Canvas 화면으로 표시한다. */
export class FeaturePageModal extends Container {
  private readonly background = new Graphics();
  private readonly page = new Container();
  private readonly content = new Container();
  private readonly status = new Text({ text: "", style: textStyle(17, 0x537145, "700") });
  private readonly options: Options;
  private readonly requested = new Set<number>();
  private ownedCategory: "cats" | "furniture" | "consumable" | "wallpaper" = "cats";
  private ownedThemePage = 0;
  private pendingConsumableId: ShopItemId | null = null;
  private consumableUsePending = false;

  constructor(options: Options) {
    super();
    this.options = options;
    this.background.eventMode = "static";
    this.addChild(this.background, this.page);
    this.buildFrame();
    this.render();
  }

  /** 현재 렌더러 크기에 맞춰 1600×900 논리 화면을 비율 유지해 배치한다. */
  layout(width: number, height: number): void {
    this.background.clear().rect(0, 0, width, height).fill(0xf8e7ca);
    layoutToFillViewport(this.page, width, height);
  }

  private buildFrame(): void {
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 70, onPress: this.options.onClose });
    back.position.set(28, 28);
    const title = new Text({ text: message(titleFor(this.options.kind)), style: textStyle(36, 0x3d2b22, "800") });
    title.position.set(120, 43);
    this.buildSidebar();
    this.status.anchor.set(0.5);
    this.status.position.set(930, 864);
    this.page.addChild(back, title);
    if (this.options.kind !== "profile" && this.options.kind !== "settings") {
      const currency = createCurrencyBar(this.options.coinIcon, this.options.getState().coins);
      currency.container.position.set(1240, 26);
      this.page.addChild(currency.container);
    }
    this.page.addChild(this.content, this.status);
  }

  private buildSidebar(): void {
    if (this.options.kind === "owned" || this.options.kind === "profile" || this.options.kind === "collection") {
      return;
    }
    const panel = new Graphics().roundRect(28, 125, 275, 710, 28).fill(0xf2d7b5).stroke({ color: 0x9a633e, width: 4 });
    this.page.addChild(panel);
    if (this.options.kind === "settings") {
      return;
    }
    const portrait = catPortrait(0);
    portrait.scale.set(0.72);
    portrait.position.set(165, 225);
    this.page.addChild(portrait);
    const entries =
      this.options.kind === "addFriend" || this.options.kind === "visitGarden"
        ? (["addFriend", "visitGarden"] as const)
        : ([] as const);
    entries.forEach((entry, index) => {
      const active = entry === this.options.kind;
      const button = new CanvasButton({
        label: message(`sidebar.${entry}`),
        width: 225,
        height: 68,
        color: active ? 0xf0ad55 : 0xe9c9a4,
        onPress: () => {
          if (entry === "addFriend" || entry === "visitGarden") {
            this.options.onNavigate(entry);
          }
        },
      });
      button.position.set(53, 320 + index * 88);
      this.page.addChild(button);
    });
  }

  private render(): void {
    this.content.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    if (this.options.kind === "profile") {
      this.renderSettings("account");
    } else if (this.options.kind === "settings") {
      this.renderSettings("settings");
    } else if (this.options.kind === "owned") {
      this.renderOwned();
    } else if (this.options.kind === "collection") {
      this.renderCatCollection();
    } else if (this.options.kind === "addFriend") {
      this.renderAddFriend();
    } else {
      this.renderGardens();
    }
  }

  private renderSettings(mode: "settings" | "account"): void {
    this.content.addChild(
      new SettingsPage({
        mode,
        onStatus: (id) => this.show(id),
        onOpenAttendance: this.options.onOpenAttendance,
        onOpenProfileImage: () => this.options.onNavigate("owned"),
        onOpenCatCollection: () => this.options.onNavigate("collection"),
        getState: this.options.getState,
        onUpdateSettings: (patch) => this.options.onUpdateSettings(patch),
        onResetLearning: this.options.onResetLearning,
        onLogout: this.options.onLogout,
      }),
    );
  }

  private renderCatCollection(): void {
    const state = this.options.getState();
    const progress = new Text({
      text: message("gacha.collectionProgress", { owned: state.ownedCats.length, total: catVariants.length }),
      style: textStyle(21, 0x604637, "700"),
    });
    progress.position.set(115, 145);
    this.content.addChild(progress);
    catVariants.forEach((variant, index) => {
      const owned = state.ownedCats.includes(variant);
      const x = 125 + index * 365;
      const card = createCozyPanel(x, 250, 315, 430, {
        fill: owned ? 0xfff5df : 0xd8d0c5,
        border: owned ? 0x91aa82 : 0x8c8176,
        radius: 26,
      });
      const portrait = new Sprite(this.options.catAnimations[variant].idle.textures[0]);
      portrait.anchor.set(0.5);
      portrait.scale.set(0.58);
      portrait.position.set(x + 158, 445);
      portrait.alpha = owned ? 1 : 0.22;
      const name = new Text({
        text: owned ? message(catNameMessages[variant]) : "? ? ?",
        style: textStyle(23, 0x493022, "800"),
      });
      name.anchor.set(0.5);
      name.position.set(x + 158, 300);
      const status = new Text({
        text: message(owned ? "gacha.collectionOwned" : "gacha.collectionMissing"),
        style: textStyle(17, owned ? 0x537145 : 0x766f68, "700"),
      });
      status.anchor.set(0.5);
      status.position.set(x + 158, 625);
      this.content.addChild(card, portrait, name, status);
    });
  }

  private renderOwned(): void {
    const state = this.options.getState();
    const stored = Object.values(state.inventory).reduce((sum, count) => sum + count, 0);
    const summary = new Text({
      text: message("owned.summary", {
        furnitureCount: stored + state.furniture.length,
        catCount: state.ownedCats.length,
        homeCatCount: state.homeCats.length,
        storedCatCount: state.ownedCats.length - state.homeCats.length,
      }),
      style: textStyle(20, 0x604637, "700"),
    });
    summary.position.set(70, 120);
    this.content.addChild(summary);
    const edit = new CanvasButton({
      label: message("owned.editRoom"),
      width: 220,
      height: 54,
      color: 0xe9a14b,
      onPress: this.options.onEnterRoomEdit,
    });
    edit.position.set(1290, 112);
    this.content.addChild(edit);
    this.buildOwnedTabs();
    if (this.ownedCategory === "cats") {
      state.ownedCats.forEach((variant, index) => {
        this.addOwnedCatCard(variant, index, state.activeCat, state.homeCats.includes(variant));
      });
      return;
    }
    if (this.ownedCategory === "wallpaper") {
      this.renderOwnedThemes(state);
      return;
    }
    if (this.ownedCategory === "consumable") {
      this.renderOwnedConsumables(state);
      if (this.pendingConsumableId) {
        this.renderConsumableCatPicker(state, this.pendingConsumableId);
      }
      return;
    }
    const entries = getOwnedFurnitureEntries(state);
    if (entries.length === 0) {
      const empty = new Text({ text: message("owned.noProducts"), style: textStyle(22, 0x76533c, "700") });
      empty.anchor.set(0.5);
      empty.position.set(800, 490);
      this.content.addChild(empty);
      return;
    }
    const pageCount = Math.ceil(entries.length / OWNED_ITEMS_PER_PAGE);
    this.ownedThemePage = Math.min(this.ownedThemePage, Math.max(0, pageCount - 1));
    const start = this.ownedThemePage * OWNED_ITEMS_PER_PAGE;
    entries.slice(start, start + OWNED_ITEMS_PER_PAGE).forEach((entry, index) => {
      const { kind } = entry;
      const x = 180 + (index % 3) * 420;
      const y = 285 + Math.floor(index / 3) * 220;
      const storedCount = entry.stored;
      const ownedCount = storedCount + entry.placed;
      const card = createCozyPanel(x, y, 380, 205, { fill: 0xfff5df, border: 0xb77a4f, radius: 22 });
      const art = createFurniturePreview(resolveFurnitureArt(this.options.furnitureArt, kind, entry.itemId), 125, 125);
      art.position.set(x + 90, y + 102);
      const name = new Text({ text: message(entry.name), style: textStyle(20, 0x493022, "800") });
      name.position.set(x + 170, y + 40);
      const count = new Text({
        text: message("owned.count", { count: ownedCount }),
        style: textStyle(17, 0x76533c, "700"),
      });
      count.position.set(x + 170, y + 92);
      const place = new CanvasButton({
        label: message(storedCount > 0 ? "owned.place" : "owned.placed"),
        width: 145,
        height: 46,
        color: storedCount > 0 ? 0x91aa82 : 0xc7aa91,
        onPress: () => {
          if (storedCount > 0) {
            this.options.onPlaceOwned(entry.itemId, kind);
          }
        },
      });
      place.position.set(x + 170, y + 135);
      this.content.addChild(card, art, name, count, place);
    });
    this.renderOwnedThemePageControls(pageCount);
  }

  private buildOwnedTabs(): void {
    const tabs = [
      ["cats", "owned.cats"],
      ["furniture", "owned.furniture"],
      ["consumable", "owned.consumable"],
      ["wallpaper", "owned.wallpaper"],
    ] as const;
    tabs.forEach(([category, label], index) => {
      const active = category === this.ownedCategory;
      const tab = new CanvasButton({
        label: message(label),
        width: 210,
        height: 54,
        color: active ? 0x8da66e : 0xe3c49f,
        textColor: active ? 0xffffff : 0x493022,
        onPress: () => {
          this.ownedCategory = category;
          this.ownedThemePage = 0;
          this.pendingConsumableId = null;
          this.render();
          if (category === "wallpaper") {
            this.preloadOwnedBackgrounds();
          }
        },
      });
      tab.position.set(125 + index * 230, 190);
      this.content.addChild(tab);
    });
  }

  private renderOwnedConsumables(state: GameState): void {
    const entries = (Object.keys(shopItemDefinitions) as ShopItemId[]).filter((itemId) => {
      const item = shopItemDefinitions[itemId];
      return item.kind === "consumable" && (state.shopInventory[itemId] ?? 0) > 0;
    });
    if (entries.length === 0) {
      const empty = new Text({ text: message("owned.noProducts"), style: textStyle(22, 0x76533c, "700") });
      empty.anchor.set(0.5);
      empty.position.set(800, 490);
      this.content.addChild(empty);
      return;
    }
    entries.forEach((itemId, index) => {
      const x = 180 + (index % 3) * 420;
      const y = 285 + Math.floor(index / 3) * 220;
      const card = createCozyPanel(x, y, 380, 195, { fill: 0xfff5df, border: 0xb77a4f, radius: 22 });
      const texture = this.options.consumableArt[itemId];
      const art = texture ? new Sprite(texture) : new Sprite();
      if (texture) {
        applySmoothTextureSampling(art);
        art.anchor.set(0.5);
        art.scale.set(Math.min(130 / texture.width, 105 / texture.height));
      }
      art.position.set(x + 92, y + 100);
      const name = new Text({ text: message(shopItemNameMessages[itemId]), style: textStyle(19, 0x493022, "800") });
      name.position.set(x + 170, y + 37);
      const count = new Text({
        text: message("owned.count", { count: state.shopInventory[itemId] ?? 0 }),
        style: textStyle(16, 0x76533c, "700"),
      });
      count.position.set(x + 170, y + 79);
      const use = new CanvasButton({
        label: message("consumable.use"),
        width: 145,
        height: 46,
        color: 0x91aa82,
        onPress: () => {
          this.pendingConsumableId = itemId;
          this.render();
        },
      });
      use.position.set(x + 170, y + 125);
      this.content.addChild(card, art, name, count, use);
    });
  }

  private renderConsumableCatPicker(state: GameState, itemId: ShopItemId): void {
    const overlay = new Container({ label: "consumable-cat-picker" });
    const blocker = new Graphics().rect(0, 0, 1_600, 900).fill({ color: 0x2f211b, alpha: 0.62 });
    blocker.eventMode = "static";
    const panel = createCozyPanel(170, 185, 1_260, 540, { fill: 0xfff3dc, border: 0x68442f, radius: 32 });
    const title = new Text({
      text: message("consumable.chooseCatTitle", { item: message(shopItemNameMessages[itemId]) }),
      style: textStyle(31, 0x3d2b22, "800"),
    });
    title.anchor.set(0.5);
    title.position.set(800, 235);
    const guide = new Text({ text: message("consumable.chooseCatGuide"), style: textStyle(17, 0x76533c, "700") });
    guide.anchor.set(0.5);
    guide.position.set(800, 282);
    const cancel = new CanvasButton({
      label: message("shop.cancel"),
      width: 130,
      height: 46,
      color: 0xc7aa91,
      onPress: () => {
        this.pendingConsumableId = null;
        this.render();
      },
    });
    cancel.position.set(1_245, 210);
    overlay.addChild(blocker, panel, title, guide, cancel);

    if (state.homeCats.length === 0) {
      const empty = new Text({ text: message("consumable.noHomeCats"), style: textStyle(22, 0x76533c, "700") });
      empty.anchor.set(0.5);
      empty.position.set(800, 475);
      overlay.addChild(empty);
      this.content.addChild(overlay);
      return;
    }

    const cardWidth = 250;
    const gap = 28;
    const totalWidth = state.homeCats.length * cardWidth + (state.homeCats.length - 1) * gap;
    const startX = 800 - totalWidth / 2;
    state.homeCats.forEach((variant, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = 330;
      const card = createCozyPanel(x, y, cardWidth, 320, { fill: 0xfff9eb, border: 0xb77a4f, radius: 24 });
      const animations = this.options.catAnimations[variant];
      const portrait = new Sprite(animations.idle.textures[0]);
      portrait.anchor.set(animations.idle.anchor.x, animations.idle.anchor.y);
      portrait.scale.set(0.38);
      portrait.position.set(x + cardWidth / 2, y + 205);
      const name = new Text({ text: message(catNameMessages[variant]), style: textStyle(20, 0x493022, "800") });
      name.anchor.set(0.5);
      name.position.set(x + cardWidth / 2, y + 38);
      const feed = new CanvasButton({
        label: message("consumable.feedSelected"),
        width: 170,
        height: 48,
        color: 0x91aa82,
        onPress: async () => {
          if (this.consumableUsePending) {
            return;
          }
          this.consumableUsePending = true;
          const used = await this.options.onUseConsumable(itemId, variant);
          if (this.destroyed) {
            return;
          }
          this.consumableUsePending = false;
          if (used) {
            this.pendingConsumableId = null;
          }
          this.render();
        },
      });
      feed.position.set(x + 40, y + 250);
      overlay.addChild(card, portrait, name, feed);
    });
    this.content.addChild(overlay);
  }

  private renderOwnedThemes(state: GameState): void {
    const entries: Array<ShopItemId | null> = [
      null,
      ...(Object.keys(shopItemDefinitions) as ShopItemId[]).filter((itemId) => {
        const item = shopItemDefinitions[itemId];
        return item.kind === "wallpaper" && (state.shopInventory[itemId] ?? 0) > 0;
      }),
    ];
    const pageCount = Math.ceil(entries.length / OWNED_THEMES_PER_PAGE);
    this.ownedThemePage = Math.min(this.ownedThemePage, Math.max(0, pageCount - 1));
    const start = this.ownedThemePage * OWNED_THEMES_PER_PAGE;
    entries.slice(start, start + OWNED_THEMES_PER_PAGE).forEach((itemId, index) => {
      const definition = itemId === null ? null : shopItemDefinitions[itemId];
      if (definition && definition.kind !== "wallpaper") {
        return;
      }
      const x = 180 + (index % 3) * 420;
      const y = 285 + Math.floor(index / 3) * 220;
      const active = state.activeWallpaper === itemId;
      const card = createCozyPanel(x, y, 380, 190, {
        fill: 0xfff5df,
        border: active ? 0x79945f : 0xb77a4f,
        radius: 22,
      });
      const preview = createBackgroundPreview(this.options.backgroundArt, itemId, 125, 76);
      preview.position.set(x + 90, y + 93);
      const name = new Text({
        text: itemId === null ? message("owned.defaultBackground") : message(shopItemNameMessages[itemId]),
        style: textStyle(19, 0x493022, "800"),
      });
      name.position.set(x + 175, y + 37);
      const count = new Text({
        text:
          itemId === null
            ? message("owned.defaultBackgroundDescription")
            : message("owned.count", { count: state.shopInventory[itemId] ?? 0 }),
        style: textStyle(15, 0x76533c, "700"),
      });
      count.position.set(x + 175, y + 76);
      const apply = new CanvasButton({
        label: message(active ? "owned.applied" : "owned.apply"),
        width: 155,
        height: 46,
        color: active ? 0xa8b49b : 0x91aa82,
        onPress: async () => {
          if (!active && (await this.options.onApplyTheme(itemId))) {
            this.render();
          }
        },
      });
      apply.position.set(x + 175, y + 115);
      this.content.addChild(card, preview, name, count, apply);
    });
    this.renderOwnedThemePageControls(pageCount);
  }

  private renderOwnedThemePageControls(pageCount: number): void {
    if (pageCount <= 1) {
      return;
    }
    const previous = new CanvasButton({
      label: message("shop.previousPage"),
      width: 105,
      height: 42,
      fontSize: 15,
      color: this.ownedThemePage > 0 ? 0xd9ad7d : 0xcbbca9,
      onPress: () => this.changeOwnedThemePage(-1, pageCount),
    });
    previous.position.set(625, 760);
    const page = new Text({
      text: message("shop.pageIndicator", { current: this.ownedThemePage + 1, total: pageCount }),
      style: textStyle(16, 0x604637, "800"),
    });
    page.anchor.set(0.5);
    page.position.set(800, 781);
    const next = new CanvasButton({
      label: message("shop.nextPage"),
      width: 105,
      height: 42,
      fontSize: 15,
      color: this.ownedThemePage < pageCount - 1 ? 0xd9ad7d : 0xcbbca9,
      onPress: () => this.changeOwnedThemePage(1, pageCount),
    });
    next.position.set(870, 760);
    this.content.addChild(previous, page, next);
  }

  private changeOwnedThemePage(offset: number, pageCount: number): void {
    const nextPage = Math.max(0, Math.min(pageCount - 1, this.ownedThemePage + offset));
    if (nextPage === this.ownedThemePage) {
      return;
    }
    this.ownedThemePage = nextPage;
    this.render();
  }

  private preloadOwnedBackgrounds(): void {
    const state = this.options.getState();
    const itemIds = (Object.keys(shopItemDefinitions) as ShopItemId[]).filter(
      (itemId) => shopItemDefinitions[itemId].kind === "wallpaper" && (state.shopInventory[itemId] ?? 0) > 0,
    );
    void this.options.backgroundArt
      .load(itemIds)
      .then(() => {
        if (!this.destroyed && this.ownedCategory === "wallpaper") {
          this.render();
        }
      })
      .catch((error: unknown) => {
        console.warn("Owned background previews could not be loaded", error);
      });
  }

  private addOwnedCatCard(variant: CatVariant, index: number, activeCat: CatVariant, visibleAtHome: boolean): void {
    const x = 180 + (index % 3) * 420;
    const y = 285 + Math.floor(index / 3) * 190;
    const active = variant === activeCat;
    const card = createCozyPanel(x, y, 360, 150, { fill: 0xfff5df, border: 0xb77a4f, radius: 22 });
    const animations = this.options.catAnimations[variant];
    const portrait = new Sprite(animations.idle.textures[0]);
    portrait.anchor.set(animations.idle.anchor.x, animations.idle.anchor.y);
    portrait.scale.set(0.32);
    portrait.position.set(x + 68, y + 130);
    const name = new Text({ text: message(catNameMessages[variant]), style: textStyle(19, 0x493022, "800") });
    name.position.set(x + 125, y + 18);
    const homeStatus = new Text({
      text: message(visibleAtHome ? "owned.catOnHome" : "owned.catStored"),
      style: textStyle(14, 0x76533c, "700"),
    });
    homeStatus.position.set(x + 125, y + 50);
    const select = new CanvasButton({
      label: message(active ? "owned.activeCat" : "owned.selectCat"),
      width: 105,
      height: 40,
      color: active ? 0xc7aa91 : 0x91aa82,
      onPress: async () => {
        if (!active && (await this.options.onSelectCat(variant))) {
          this.render();
        }
      },
    });
    select.position.set(x + 125, y + 91);
    const toggleHome = new CanvasButton({
      label: message(visibleAtHome ? "owned.storeCat" : "owned.showCat"),
      width: 105,
      height: 40,
      color: visibleAtHome ? 0xd7ad7e : 0x91aa82,
      onPress: async () => {
        if (await this.options.onSetCatHome(variant, !visibleAtHome)) {
          this.render();
        }
      },
    });
    toggleHome.position.set(x + 240, y + 91);
    this.content.addChild(card, portrait, name, homeStatus, select, toggleHome);
  }

  private renderAddFriend(): void {
    const leftPanel = new Graphics()
      .roundRect(335, 125, 555, 700, 28)
      .fill(0xfff0dc)
      .stroke({ color: 0x9a633e, width: 4 });
    const rightPanel = new Graphics()
      .roundRect(920, 125, 640, 700, 28)
      .fill(0xfff0dc)
      .stroke({ color: 0x9a633e, width: 4 });
    const addTitle = new Text({ text: message("friends.newFriend"), style: textStyle(26, 0x493022, "800") });
    addTitle.anchor.set(0.5);
    addTitle.position.set(612, 170);
    const search = new Graphics().roundRect(380, 255, 350, 62, 18).fill(0xffffff).stroke({ color: 0xb77a4f, width: 3 });
    const placeholder = new Text({ text: message("friends.searchPlaceholder"), style: textStyle(19, 0x9a806f, "600") });
    placeholder.position.set(405, 273);
    const searchButton = new CanvasButton({
      label: message("friends.search"),
      width: 180,
      height: 60,
      color: 0x91aa82,
      onPress: () => this.show("friends.searchDone"),
    });
    searchButton.position.set(680, 256);
    const heading = new Text({ text: message("friends.recommended"), style: textStyle(24, 0x493022, "800") });
    heading.anchor.set(0.5);
    heading.position.set(1240, 170);
    const myId = new Text({ text: message("friends.myId"), style: textStyle(20, 0x493022, "800") });
    myId.anchor.set(0.5);
    myId.position.set(612, 390);
    const idCard = new Graphics().roundRect(405, 425, 415, 70, 20).fill(0xfff8eb).stroke({ color: 0xd1a678, width: 2 });
    const idText = new Text({ text: message("friends.myIdValue"), style: textStyle(21, 0x493022, "700") });
    idText.anchor.set(0.5);
    idText.position.set(612, 460);
    const mascot = catPortrait(0);
    mascot.scale.set(1.05);
    mascot.position.set(612, 650);
    this.content.addChild(
      leftPanel,
      rightPanel,
      addTitle,
      search,
      placeholder,
      searchButton,
      heading,
      myId,
      idCard,
      idText,
      mascot,
    );
    friendNames.slice(0, 3).forEach((nameId, index) => {
      this.addFriendCard(nameId, index);
    });
  }

  private addFriendCard(nameId: MessageId, index: number): void {
    const x = 955;
    const y = 220 + index * 185;
    const card = new Graphics().roundRect(x, y, 570, 150, 22).fill(0xfff8eb).stroke({ color: 0xd1a678, width: 3 });
    const portrait = catPortrait(index);
    portrait.scale.set(0.62);
    portrait.position.set(x + 75, y + 72);
    const name = new Text({ text: message(nameId), style: textStyle(24, 0x493022, "800") });
    name.position.set(x + 140, y + 30);
    const info = new Text({
      text: message("friends.profile"),
      style: textStyle(16, 0x76533c, "600"),
    });
    info.position.set(x + 140, y + 78);
    const sent = this.requested.has(index);
    const add = new CanvasButton({
      label: message(sent ? "friends.requested" : "friends.add"),
      width: 180,
      height: 52,
      color: sent ? 0xc7aa91 : 0x91aa82,
      onPress: () => {
        if (!sent) {
          this.requested.add(index);
          this.show("friends.requestSent");
          this.render();
        }
      },
    });
    add.position.set(x + 365, y + 48);
    this.content.addChild(card, portrait, name, info, add);
  }

  private renderGardens(): void {
    const heading = new Text({ text: message("garden.friendList"), style: textStyle(24, 0x493022, "800") });
    heading.position.set(350, 135);
    this.content.addChild(heading);
    friendNames.forEach((nameId, index) => {
      const x = 340 + (index % 3) * 405;
      const y = 195 + Math.floor(index / 3) * 310;
      const card = new Graphics().roundRect(x, y, 385, 285, 24).fill(0xfff5df).stroke({ color: 0xb77a4f, width: 3 });
      const room = new Graphics()
        .poly([x + 30, y + 135, x + 192, y + 82, x + 355, y + 135, x + 192, y + 220])
        .fill(index % 2 === 0 ? 0xd8b482 : 0xa89178)
        .stroke({ color: 0x76513a, width: 3 });
      const portrait = catPortrait(index);
      portrait.scale.set(0.42);
      portrait.position.set(x + 65, y + 58);
      const name = new Text({ text: message(nameId), style: textStyle(23, 0x493022, "800") });
      name.position.set(x + 115, y + 25);
      const detail = new Text({
        text: message("garden.detail", { likes: 28 + index * 17 }),
        style: textStyle(16, 0x76533c, "600"),
      });
      detail.position.set(x + 105, y + 65);
      const visit = new CanvasButton({
        label: message("garden.visit"),
        width: 145,
        height: 48,
        color: 0x91aa82,
        onPress: () => this.show("garden.visiting", { friend: message(nameId) }),
      });
      visit.position.set(x + 220, y + 225);
      this.content.addChild(card, room, portrait, name, detail, visit);
    });
  }

  private show(id: MessageId, variables?: Record<string, string | number>): void {
    this.status.text = message(id, variables);
  }
}

const OWNED_THEMES_PER_PAGE = 6;
const OWNED_ITEMS_PER_PAGE = 6;

const friendNames: MessageId[] = [
  "friends.nameMango",
  "friends.nameNabi",
  "friends.nameBori",
  "friends.namePythonista",
  "friends.nameCodeMeow",
  "friends.nameStudyCat",
];
const catNameMessages: Record<CatVariant, MessageId> = {
  fluffy: "cat.fluffyName",
  ink: "cat.inkName",
  siamese: "cat.siameseName",
  tabby: "cat.tabbyName",
};
function titleFor(kind: FeaturePageKind): MessageId {
  return `page.${kind}Title`;
}
function catPortrait(variant: number): Graphics {
  const colors = [0xe8964e, 0x8e9dad, 0xc7a06f];
  return new Graphics()
    .circle(0, 0, 58)
    .fill(0xffe8bd)
    .stroke({ color: 0x69432c, width: 4 })
    .poly([-38, -30, -30, -72, -5, -42, 25, -70, 38, -28])
    .fill(colors[variant])
    .stroke({ color: 0x69432c, width: 4 })
    .circle(-18, -2, 5)
    .circle(18, -2, 5)
    .fill(0x3d2b22)
    .circle(0, 17, 5)
    .fill(0xb96e61);
}
