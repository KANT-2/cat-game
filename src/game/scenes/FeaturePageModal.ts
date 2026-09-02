import { Container, Graphics, Sprite, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { CatVariant } from "../../domain/cats";
import type { FurnitureKind, GameState } from "../../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../../domain/shop";
import { CanvasButton } from "../components/CanvasButton";
import { textStyle } from "../config";
import type { CatAnimationLibrary } from "../entities/CatAnimations";
import { SettingsPage } from "./SettingsPage";

export type FeaturePageKind = "settings" | "owned" | "addFriend" | "visitGarden";

type Options = {
  kind: FeaturePageKind;
  getState: () => GameState;
  onClose: () => void;
  onNavigate: (kind: FeaturePageKind) => void;
  onPlaceOwned: (itemId: ShopItemId | undefined, kind: FurnitureKind) => void;
  onSelectCat: (variant: CatVariant) => boolean;
  onSetCatHome: (variant: CatVariant, visible: boolean) => boolean;
  catAnimations: CatAnimationLibrary;
};
/** 설정·보유·친구 기능을 전체 Canvas 화면으로 표시한다. */
export class FeaturePageModal extends Container {
  private readonly background = new Graphics();
  private readonly page = new Container();
  private readonly content = new Container();
  private readonly status = new Text({ text: "", style: textStyle(17, 0x537145, "700") });
  private readonly options: Options;
  private readonly requested = new Set<number>();

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
    const scale = Math.min(width / 1600, height / 900);
    this.page.scale.set(scale);
    this.page.position.set((width - 1600 * scale) / 2, (height - 900 * scale) / 2);
  }

  private buildFrame(): void {
    const back = new CanvasButton({
      label: "‹",
      width: 70,
      height: 64,
      color: 0xd9ad7d,
      onPress: this.options.onClose,
    });
    back.position.set(28, 28);
    const title = new Text({ text: message(titleFor(this.options.kind)), style: textStyle(36, 0x3d2b22, "800") });
    title.position.set(120, 43);
    const currency = new Graphics()
      .roundRect(1110, 26, 450, 62, 28)
      .fill(0x795037)
      .stroke({ color: 0x4e3020, width: 4 });
    const currencyText = new Text({
      text: message("page.currency", {
        coins: this.options.getState().coins.toLocaleString(),
        gems: this.options.getState().gems,
      }),
      style: textStyle(20, 0xfff1d2, "800"),
    });
    currencyText.anchor.set(0.5);
    currencyText.position.set(1335, 57);
    this.buildSidebar();
    this.status.anchor.set(0.5);
    this.status.position.set(930, 864);
    this.page.addChild(back, title, currency, currencyText, this.content, this.status);
  }

  private buildSidebar(): void {
    if (this.options.kind === "owned") {
      return;
    }
    const panel = new Graphics().roundRect(28, 125, 275, 710, 28).fill(0xf2d7b5).stroke({ color: 0x9a633e, width: 4 });
    const portrait = catPortrait(0);
    portrait.scale.set(0.72);
    portrait.position.set(165, 205);
    const level = new Text({ text: message("page.profileLevel"), style: textStyle(17, 0x493022, "800") });
    level.anchor.set(0.5);
    level.position.set(165, 270);
    this.page.addChild(panel, portrait, level);
    if (this.options.kind === "settings") {
      return;
    }
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
    if (this.options.kind === "settings") {
      this.renderSettings();
    } else if (this.options.kind === "owned") {
      this.renderOwned();
    } else if (this.options.kind === "addFriend") {
      this.renderAddFriend();
    } else {
      this.renderGardens();
    }
  }

  private renderSettings(): void {
    this.content.addChild(new SettingsPage({ onStatus: (id) => this.show(id) }));
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
    summary.position.set(180, 155);
    this.content.addChild(summary);
    const catHeading = new Text({ text: message("owned.cats"), style: textStyle(22, 0x493022, "800") });
    catHeading.position.set(180, 200);
    this.content.addChild(catHeading);
    state.ownedCats.forEach((variant, index) => {
      this.addOwnedCatCard(variant, index, state.activeCat, state.homeCats.includes(variant));
    });
    const furnitureHeading = new Text({ text: message("owned.furniture"), style: textStyle(22, 0x493022, "800") });
    furnitureHeading.position.set(180, 405);
    this.content.addChild(furnitureHeading);
    const entries: Array<{
      key: string;
      itemId?: ShopItemId;
      kind: FurnitureKind;
      name: MessageId;
      stored: number;
      placed: number;
    }> = [];
    for (const itemId of Object.keys(shopItemDefinitions) as ShopItemId[]) {
      const kind = shopItemDefinitions[itemId].furnitureKind;
      const storedCount = state.shopInventory[itemId] ?? 0;
      const placed = state.furniture.filter((item) => item.shopItemId === itemId).length;
      if (storedCount > 0 || placed > 0) {
        entries.push({ key: itemId, itemId, kind, name: productNameMessages[itemId], stored: storedCount, placed });
      }
    }
    for (const kind of Object.keys(state.inventory) as FurnitureKind[]) {
      const exactStored = (Object.keys(shopItemDefinitions) as ShopItemId[])
        .filter((itemId) => shopItemDefinitions[itemId].furnitureKind === kind)
        .reduce((sum, itemId) => sum + (state.shopInventory[itemId] ?? 0), 0);
      const genericStored = Math.max(0, state.inventory[kind] - exactStored);
      const genericPlaced = state.furniture.filter((item) => item.kind === kind && !item.shopItemId).length;
      if (genericStored > 0 || genericPlaced > 0) {
        const canonicalId = canonicalProductIds[kind];
        const existing = entries.find((entry) => entry.itemId === canonicalId);
        if (existing) {
          existing.stored += genericStored;
          existing.placed += genericPlaced;
        } else {
          entries.push({
            key: canonicalId,
            itemId: genericStored > 0 ? canonicalId : undefined,
            kind,
            name: genericProductNameMessages[kind],
            stored: genericStored,
            placed: genericPlaced,
          });
        }
      }
    }
    if (entries.length === 0) {
      const empty = new Text({ text: message("owned.noProducts"), style: textStyle(22, 0x76533c, "700") });
      empty.anchor.set(0.5);
      empty.position.set(800, 560);
      this.content.addChild(empty);
      return;
    }
    entries.forEach((entry, index) => {
      const { kind } = entry;
      const x = 180 + (index % 3) * 420;
      const y = 445 + Math.floor(index / 3) * 220;
      const storedCount = entry.stored;
      const ownedCount = storedCount + entry.placed;
      const card = new Graphics().roundRect(x, y, 380, 205, 22).fill(0xfff5df).stroke({ color: 0xb77a4f, width: 3 });
      const art = furnitureBadge(kind);
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
  }

  private addOwnedCatCard(variant: CatVariant, index: number, activeCat: CatVariant, visibleAtHome: boolean): void {
    const x = 180 + index * 390;
    const y = 235;
    const active = variant === activeCat;
    const card = new Graphics().roundRect(x, y, 360, 150, 22).fill(0xfff5df).stroke({ color: 0xb77a4f, width: 3 });
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
      onPress: () => {
        if (!active && this.options.onSelectCat(variant)) {
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
      onPress: () => {
        if (this.options.onSetCatHome(variant, !visibleAtHome)) {
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
      text: message("friends.profile", { level: 12 + index * 4 }),
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
        text: message("garden.detail", { level: 12 + index * 4, likes: 28 + index * 17 }),
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

const friendNames: MessageId[] = [
  "friends.nameMango",
  "friends.nameNabi",
  "friends.nameBori",
  "friends.namePythonista",
  "friends.nameCodeMeow",
  "friends.nameStudyCat",
];
const productNameMessages: Record<ShopItemId, MessageId> = {
  "furniture.sofa": "shop.productSofa",
  "furniture.table": "shop.productTable",
  "furniture.catTower": "shop.productCatTower",
  "furniture.bed": "shop.productBed",
  "furniture.desk": "shop.productDesk",
  "furniture.premiumTower": "shop.productPremiumTower",
  "decor.plant": "shop.productPlant",
};
const genericProductNameMessages: Record<FurnitureKind, MessageId> = {
  sofa: "shop.productSofa",
  desk: "shop.productDesk",
  plant: "shop.productPlant",
  catTree: "shop.productCatTower",
  bed: "shop.productBed",
};
const canonicalProductIds: Record<FurnitureKind, ShopItemId> = {
  sofa: "furniture.sofa",
  desk: "furniture.desk",
  plant: "decor.plant",
  catTree: "furniture.catTower",
  bed: "furniture.bed",
};
const catNameMessages: Record<CatVariant, MessageId> = {
  fluffy: "cat.fluffyName",
  ink: "cat.inkName",
  siamese: "cat.siameseName",
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

function furnitureBadge(kind: FurnitureKind): Graphics {
  const colors: Record<FurnitureKind, number> = {
    sofa: 0xc97e62,
    desk: 0xa46d45,
    plant: 0x7b9b67,
    catTree: 0xc49a62,
    bed: 0xd59b7a,
  };
  return new Graphics()
    .circle(0, 0, 62)
    .fill(0xffe7bd)
    .stroke({ color: 0x69432c, width: 4 })
    .roundRect(-38, -25, 76, 52, 12)
    .fill(colors[kind])
    .stroke({ color: 0x69432c, width: 3 });
}
