import { Container, Graphics, Sprite, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GachaDrawResult, GachaReward } from "../../core/GameClient";
import type { CatVariant } from "../../domain/cats";
import { type GachaDrawCount, type GachaRewardId, gachaCost } from "../../domain/gacha";
import type { GameState } from "../../domain/room";
import { BackButton } from "../components/BackButton";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { createCoinIcon, createCurrencyBar } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type GachaSceneOptions = {
  getState: () => GameState;
  onBack: () => void;
  onDraw: (count: GachaDrawCount) => GachaDrawResult;
  onSelectCat: (variant: CatVariant) => void;
  backdropArt: string;
  machineArt: string;
  backIcon: string;
  coinIcon: string;
};

export class GachaScene extends Container {
  private readonly content = new Container();
  private readonly mainLayer = new Container();
  private readonly headerLayer = new Container();
  private readonly resultLayer = new Container();
  private readonly confirmLayer = new Container();
  private coinsText: Text | null = null;
  private readonly options: GachaSceneOptions;

  constructor(options: GachaSceneOptions) {
    super();
    this.options = options;
    this.addChild(this.content);
    this.content.addChild(this.mainLayer, this.resultLayer, this.confirmLayer);
    const backdrop = Sprite.from(options.backdropArt);
    applySmoothTextureSampling(backdrop);
    backdrop.width = BASE_WIDTH;
    backdrop.height = BASE_HEIGHT;
    this.mainLayer.addChild(backdrop);
    this.buildHeader(options);
    this.buildMachine();
    this.buildDrawButtons();
    this.mainLayer.addChild(this.headerLayer);
  }

  layout(width: number, height: number): void {
    layoutToFillViewport(this.content, width, height);
  }

  private buildHeader(options: GachaSceneOptions): void {
    const back = new BackButton({ iconSrc: options.backIcon, size: 72, onPress: options.onBack });
    back.position.set(24, 20);
    const title = new Text({ text: message("gacha.title"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(130, 35);
    const ornament = createTitleOrnament(132, 78, 110);
    const state = options.getState();
    const currency = createCurrencyBar(options.coinIcon, state.coins);
    currency.container.position.set(1240, 20);
    this.coinsText = currency.amountText;
    this.headerLayer.addChild(back, title, ornament, currency.container);
  }

  private buildMachine(): void {
    const shadow = new Graphics().ellipse(800, 720, 205, 25).fill({ color: 0x75452c, alpha: 0.16 });
    const machine = Sprite.from(this.options.machineArt);
    applySmoothTextureSampling(machine);
    machine.anchor.set(0.5);
    machine.position.set(800, 405);
    machine.width = 445;
    machine.height = 668;
    const sparkle = new Graphics()
      .poly([555, 165, 563, 188, 586, 196, 563, 204, 555, 227, 547, 204, 524, 196, 547, 188])
      .fill(0xffc84f)
      .poly([1035, 480, 1041, 498, 1059, 504, 1041, 510, 1035, 528, 1029, 510, 1011, 504, 1029, 498])
      .fill(0xffdf76);
    this.mainLayer.addChild(shadow, machine, sparkle);
  }

  private buildDrawButtons(): void {
    const once = createDrawButton({
      title: message("gacha.drawOnceTitle"),
      cost: gachaCost(1),
      coinIcon: this.options.coinIcon,
      color: 0xcddf91,
      onPress: () => this.confirmDraw(1),
    });
    once.position.set(480, 730);
    const ten = createDrawButton({
      title: message("gacha.drawTenTitle"),
      cost: gachaCost(11),
      coinIcon: this.options.coinIcon,
      color: 0xf3ad54,
      onPress: () => this.confirmDraw(11),
    });
    ten.position.set(820, 730);
    this.mainLayer.addChild(once, ten);
  }

  private confirmDraw(count: GachaDrawCount): void {
    this.closeConfirmation();
    this.mainLayer.visible = false;
    const panel = createCozyPanel(300, 155, 1000, 590, { fill: 0xfff5df, border: 0x87502e, radius: 32 });
    const displayCount = count === 1 ? 1 : "10+1";
    const coin = createCoinIcon(this.options.coinIcon, 76);
    coin.position.set(762, 210);
    const title = centeredText(message("gacha.confirmTitle", { count: displayCount }), 800, 330, 34);
    const detail = new Text({
      text: message("gacha.confirmDetail", { cost: gachaCost(count) }),
      style: { ...textStyle(20, 0x6b4935, "600"), align: "center", wordWrap: true, wordWrapWidth: 680, lineHeight: 32 },
    });
    detail.anchor.set(0.5, 0);
    detail.position.set(800, 400);
    const cancel = new CanvasButton({
      label: message("gacha.cancel"),
      width: 210,
      height: 64,
      fontSize: 20,
      color: 0xd8bea0,
      onPress: () => this.closeConfirmation(),
    });
    cancel.position.set(535, 550);
    const confirm = new CanvasButton({
      label: message("gacha.confirmPurchase"),
      width: 210,
      height: 64,
      fontSize: 20,
      color: 0xf2aa4d,
      onPress: () => this.draw(count),
    });
    confirm.position.set(855, 550);
    this.confirmLayer.addChild(createBlocker(), panel, coin, title, detail, cancel, confirm);
  }

  private closeConfirmation(): void {
    this.confirmLayer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    this.mainLayer.visible = true;
  }

  private draw(count: GachaDrawCount): void {
    this.closeConfirmation();
    const result = this.options.onDraw(count);
    if (!result.ok) {
      this.showFailure();
      return;
    }
    if (this.coinsText) {
      this.coinsText.text = result.remainingCoins.toLocaleString();
    }
    this.showResults(result);
  }

  private showFailure(): void {
    this.clearResults();
    this.mainLayer.visible = false;
    const panel = createCozyPanel(350, 190, 900, 520, { fill: 0xfff4df, border: 0x7b4b32, radius: 30 });
    const title = centeredText(message("gacha.insufficientCoins"), 800, 355, 32);
    const close = new CanvasButton({
      label: message("gacha.resultClose"),
      width: 180,
      height: 64,
      fontSize: 20,
      color: 0xd7ad7e,
      onPress: () => this.clearResults(),
    });
    close.position.set(710, 495);
    this.resultLayer.addChild(createBlocker(), panel, title, close);
  }

  private showResults(result: Extract<GachaDrawResult, { ok: true }>): void {
    this.clearResults();
    this.mainLayer.visible = false;
    const blocker = createBlocker();
    const panel = createCozyPanel(110, 95, 1380, 740, { fill: 0xfff4df, border: 0x7b4b32, radius: 34 });
    const title = centeredText(message("gacha.resultTitle", { count: result.rewards.length }), 800, 155, 36);
    const guide = centeredText(message("gacha.resultStored"), 800, 205, 20);
    this.resultLayer.addChild(blocker, panel, title, guide);

    result.rewards.forEach((reward, index) => {
      this.addResultCard(reward, index, result.rewards.length);
    });
    const unlockedCat = result.rewards.find(
      (reward): reward is GachaReward & { catVariant: CatVariant } =>
        reward.kind === "cat" && Boolean(reward.catVariant) && !reward.duplicate,
    );
    if (unlockedCat) {
      const select = new CanvasButton({
        label: message("gacha.selectMainCat"),
        width: 260,
        height: 64,
        fontSize: 20,
        color: 0x91aa55,
        onPress: () => this.options.onSelectCat(unlockedCat.catVariant),
      });
      select.position.set(650, 715);
      this.resultLayer.addChild(select);
      return;
    }
    const close = new CanvasButton({
      label: message("gacha.resultClose"),
      width: 200,
      height: 64,
      fontSize: 20,
      color: 0xd7ad7e,
      onPress: () => this.clearResults(),
    });
    close.position.set(700, 715);
    this.resultLayer.addChild(close);
  }

  private addResultCard(reward: GachaReward, index: number, total: number): void {
    const columns = total === 1 ? 1 : 4;
    const cardWidth = total === 1 ? 400 : 205;
    const x = total === 1 ? 600 : 370 + (index % columns) * 220;
    const y = total === 1 ? 265 : 235 + Math.floor(index / columns) * 145;
    const card = new Graphics()
      .roundRect(x, y, cardWidth, total === 1 ? 370 : 130, 20)
      .fill(0xffead0)
      .stroke({ color: 0x8a5738, width: 3 });
    const art = rewardArt(reward.id);
    art.scale.set(total === 1 ? 1.65 : 0.58);
    art.position.set(x + cardWidth / 2, y + (total === 1 ? 165 : 65));
    const rewardName = message(rewardNameMessages[reward.id]);
    const name = centeredText(rewardName, x + cardWidth / 2, y + (total === 1 ? 295 : 105), total === 1 ? 24 : 14);
    this.resultLayer.addChild(card, art, name);
    if (reward.duplicate) {
      const duplicate = centeredText(
        message("gacha.duplicateExchange", { amount: reward.exchangeCoins }),
        x + cardWidth / 2,
        y + (total === 1 ? 330 : 120),
        total === 1 ? 18 : 12,
      );
      this.resultLayer.addChild(duplicate);
    }
  }

  private clearResults(): void {
    this.resultLayer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    this.mainLayer.visible = true;
  }
}

function centeredText(value: string, x: number, y: number, size: number): Text {
  const text = new Text({ text: value, style: textStyle(size, 0x4b3021, "800") });
  text.anchor.set(0.5);
  text.position.set(x, y);
  return text;
}
function drawMiniCat(color: number): Graphics {
  return new Graphics()
    .ellipse(0, 20, 35, 25)
    .fill(color)
    .stroke({ color: 0x4a3024, width: 3 })
    .circle(0, -12, 29)
    .fill(color)
    .stroke({ color: 0x4a3024, width: 3 })
    .poly([-23, -28, -18, -52, -3, -31, 11, -31, 23, -53, 25, -25])
    .fill(color)
    .stroke({ color: 0x4a3024, width: 3 })
    .circle(-9, -13, 3)
    .circle(9, -13, 3)
    .fill(0xffd36c);
}
function drawDesk(): Graphics {
  return new Graphics()
    .rect(-35, -15, 70, 35)
    .fill(0x9b603b)
    .stroke({ color: 0x553426, width: 3 })
    .rect(-29, 20, 7, 35)
    .rect(22, 20, 7, 35)
    .fill(0x6f422d);
}

function rewardArt(rewardId: GachaRewardId): Graphics {
  if (rewardId === "cat.ink") {
    return drawMiniCat(0x333333);
  }
  if (rewardId === "furniture.desk") {
    return drawDesk();
  }
  if (rewardId === "furniture.catTower") {
    return drawCatTower();
  }
  if (rewardId === "decor.plant") {
    return drawPlant();
  }
  return drawSofa();
}

function drawCatTower(): Graphics {
  return new Graphics()
    .roundRect(-28, 5, 56, 55, 7)
    .fill(0xb77b49)
    .stroke({ color: 0x553426, width: 3 })
    .rect(-5, -52, 10, 58)
    .fill(0x8d5b38)
    .ellipse(0, -55, 38, 12)
    .fill(0xc58e55)
    .stroke({ color: 0x553426, width: 3 });
}

function drawPlant(): Graphics {
  return new Graphics()
    .roundRect(-24, 15, 48, 40, 8)
    .fill(0xbc8259)
    .stroke({ color: 0x553426, width: 3 })
    .ellipse(-14, -5, 13, 31)
    .ellipse(8, -14, 14, 36)
    .ellipse(20, 0, 12, 28)
    .fill(0x6f9858)
    .stroke({ color: 0x43623b, width: 2 });
}

function drawSofa(): Graphics {
  return new Graphics()
    .roundRect(-48, -20, 96, 55, 13)
    .fill(0xc97e62)
    .stroke({ color: 0x553426, width: 3 })
    .roundRect(-55, 8, 110, 35, 12)
    .fill(0xd79a79)
    .stroke({ color: 0x553426, width: 3 });
}

function createBlocker(): Graphics {
  const blocker = new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(0xf8e7ca);
  blocker.eventMode = "static";
  return blocker;
}

const rewardNameMessages: Record<GachaRewardId, MessageId> = {
  "cat.ink": "gacha.blackCat",
  "cat.tabby": "gacha.tabbyCat",
  "furniture.desk": "gacha.studyDesk",
  "furniture.catTower": "gacha.miniCatTower",
  "decor.plant": "shop.productPlant",
  "furniture.sofa": "shop.productSofa",
};

type DrawButtonOptions = {
  title: string;
  cost: number;
  coinIcon: string;
  color: number;
  onPress: () => void;
};

function createDrawButton(options: DrawButtonOptions): Container {
  const button = new Container();
  const background = new Graphics()
    .roundRect(0, 0, 300, 112, 24)
    .fill(options.color)
    .stroke({ color: 0x765039, width: 4 });
  const pricePanel = new Graphics()
    .roundRect(25, 57, 250, 42, 15)
    .fill({ color: 0xffffff, alpha: 0.24 })
    .stroke({ color: 0x765039, width: 2, alpha: 0.42 });
  const title = centeredText(options.title, 150, 29, 25);
  const coin = createCoinIcon(options.coinIcon, 34);
  coin.position.set(92, 61);
  const cost = centeredText(options.cost.toLocaleString(), 175, 78, 28);
  button.addChild(background, pricePanel, title, coin, cost);
  button.eventMode = "static";
  button.cursor = "pointer";
  button.on("pointerdown", () => button.scale.set(0.98));
  button.on("pointerout", () => button.scale.set(1));
  button.on("pointerupoutside", () => button.scale.set(1));
  button.on("pointerup", () => {
    button.scale.set(1);
    options.onPress();
  });
  return button;
}
