import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GachaDrawResult, GachaReward } from "../../core/GameClient";
import type { CatVariant } from "../../domain/cats";
import { type GachaDrawCount, type GachaRewardId, gachaRewardDefinitions } from "../../domain/gacha";
import type { GameState } from "../../domain/room";
import { CanvasButton } from "../components/CanvasButton";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type GachaSceneOptions = {
  getState: () => GameState;
  onBack: () => void;
  onDraw: (count: GachaDrawCount) => GachaDrawResult;
  onSelectCat: (variant: CatVariant) => void;
};

export class GachaScene extends Container {
  private readonly content = new Container();
  private readonly resultLayer = new Container();
  private readonly gemsText = new Text({ text: "", style: textStyle(21, 0x3d2b22, "800") });
  private readonly options: GachaSceneOptions;

  constructor(options: GachaSceneOptions) {
    super();
    this.options = options;
    this.addChild(this.content);
    this.content.addChild(
      new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(0xf8e5c5).rect(0, 680, BASE_WIDTH, 220).fill(0xdca76e),
    );
    this.buildHeader(options);
    this.buildPickup();
    this.buildMachine();
    this.buildRewards();
    this.buildDrawButtons();
    this.content.addChild(this.resultLayer);
  }

  layout(width: number, height: number): void {
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.content.scale.set(scale);
    this.content.position.set((width - BASE_WIDTH * scale) / 2, (height - BASE_HEIGHT * scale) / 2);
  }

  private buildHeader(options: GachaSceneOptions): void {
    const back = new CanvasButton({
      label: message("gacha.back"),
      width: 82,
      height: 68,
      color: 0xf1bd82,
      onPress: options.onBack,
    });
    back.position.set(24, 20);
    const title = new Text({ text: message("gacha.title"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(130, 35);
    const state = options.getState();
    const currency = new Graphics()
      .roundRect(1090, 20, 470, 62, 25)
      .fill(0xf1d3aa)
      .stroke({ color: 0x70442b, width: 4 });
    const coin = new Graphics().circle(1130, 51, 22).fill(0xf5bd39).stroke({ color: 0xa4601f, width: 4 });
    const cash = new Graphics().roundRect(1340, 32, 52, 38, 7).fill(0x75a844).stroke({ color: 0x365b2b, width: 3 });
    const coins = new Text({ text: state.coins.toLocaleString(), style: textStyle(21, 0x3d2b22, "800") });
    coins.anchor.set(1, 0.5);
    coins.position.set(1310, 51);
    this.gemsText.text = String(state.gems);
    this.gemsText.anchor.set(1, 0.5);
    this.gemsText.position.set(1528, 51);
    this.content.addChild(back, title, currency, coin, cash, coins, this.gemsText);
  }

  private buildPickup(): void {
    const panel = new Graphics().roundRect(42, 108, 470, 330, 24).fill(0xfff3dc).stroke({ color: 0x99603b, width: 4 });
    const heading = centeredText(message("gacha.pickup"), 277, 138, 23);
    this.content.addChild(panel, heading);
    const labels = [message("gacha.blackCat"), message("gacha.studyDesk"), message("gacha.miniCatTower")];
    labels.forEach((label, index) => {
      const x = 65 + index * 145;
      const card = new Graphics().roundRect(x, 170, 132, 190, 15).fill(0xffe8c3).stroke({ color: 0xc48750, width: 3 });
      const rarity = new Text({
        text: index === 0 ? "SSR" : "SR",
        style: textStyle(16, index === 0 ? 0xb56b13 : 0x8f4b91, "800"),
      });
      rarity.position.set(x + 8, 180);
      const art = pickupArt(index);
      art.position.set(x + 66, 258);
      const name = centeredText(label, x + 66, 333, 14);
      this.content.addChild(card, rarity, art, name);
    });
    const odds = new Graphics().roundRect(105, 455, 365, 220, 20).fill(0xfff0d6).stroke({ color: 0xa8754d, width: 3 });
    const oddsTitle = centeredText(message("gacha.odds"), 287, 480, 21);
    const oddsText = new Text({
      text: message("gacha.oddsList"),
      style: { ...textStyle(17, 0x4b3021, "700"), lineHeight: 38 },
    });
    oddsText.position.set(145, 515);
    this.content.addChild(odds, oddsTitle, oddsText);
  }

  private buildMachine(): void {
    const machine = new Graphics()
      .circle(800, 315, 190)
      .fill({ color: 0xeaf4f0, alpha: 0.72 })
      .stroke({ color: 0x9b643e, width: 8 })
      .roundRect(620, 430, 360, 280, 80)
      .fill(0xe98682)
      .stroke({ color: 0x8c5037, width: 8 })
      .circle(800, 120, 105)
      .fill(0xffd599)
      .stroke({ color: 0x8c5037, width: 7 })
      .poly([715, 105, 735, 35, 790, 94, 845, 40, 883, 112])
      .fill(0xf3ad78)
      .stroke({ color: 0x8c5037, width: 6 })
      .circle(760, 290, 55)
      .fill({ color: 0xf1a7b4, alpha: 0.8 })
      .circle(840, 330, 58)
      .fill({ color: 0xa9d3e1, alpha: 0.8 })
      .circle(775, 390, 54)
      .fill({ color: 0xd5e4a5, alpha: 0.8 })
      .circle(875, 245, 50)
      .fill({ color: 0xffd990, alpha: 0.8 })
      .circle(800, 530, 66)
      .fill(0xf2b16c)
      .stroke({ color: 0x8c5037, width: 6 })
      .circle(800, 530, 34)
      .fill(0x8b5438)
      .roundRect(740, 615, 120, 58, 12)
      .fill(0x4f3327);
    const bubble = new Graphics().roundRect(980, 280, 205, 78, 22).fill(0xffffff).stroke({ color: 0x68442f, width: 3 });
    const bubbleText = centeredText(message("gacha.bubble"), 1082, 319, 17);
    this.content.addChild(machine, bubble, bubbleText);
  }

  private buildRewards(): void {
    const panel = new Graphics()
      .roundRect(1190, 108, 365, 570, 24)
      .fill(0xfff3dc)
      .stroke({ color: 0x99603b, width: 4 });
    const heading = centeredText(message("gacha.rewards"), 1372, 140, 22);
    this.content.addChild(panel, heading);
    for (let index = 0; index < 9; index += 1) {
      const reward = gachaRewardDefinitions[index % gachaRewardDefinitions.length];
      const x = 1215 + (index % 3) * 108;
      const y = 180 + Math.floor(index / 3) * 150;
      const cell = new Graphics().roundRect(x, y, 94, 130, 12).fill(0xffead0).stroke({ color: 0xc38a58, width: 2 });
      const art = rewardArt(reward.id);
      art.scale.set(0.58);
      art.position.set(x + 47, y + 64);
      const rarity = new Text({
        text: reward.rarity,
        style: textStyle(13, 0x70442b, "800"),
      });
      rarity.position.set(x + 7, y + 6);
      this.content.addChild(cell, art, rarity);
    }
  }

  private buildDrawButtons(): void {
    const once = new CanvasButton({
      label: message("gacha.drawOnce"),
      width: 270,
      height: 84,
      color: 0xcddf91,
      onPress: () => this.draw(1),
    });
    once.position.set(505, 745);
    const ten = new CanvasButton({
      label: message("gacha.drawTen"),
      width: 300,
      height: 84,
      color: 0xf3ad54,
      onPress: () => this.draw(11),
    });
    ten.position.set(825, 745);
    const guarantee = centeredText(message("gacha.guarantee"), 800, 862, 17);
    this.content.addChild(once, ten, guarantee);
  }

  private draw(count: GachaDrawCount): void {
    const result = this.options.onDraw(count);
    if (!result.ok) {
      this.showFailure();
      return;
    }
    this.gemsText.text = String(result.remainingGems);
    this.showResults(result);
  }

  private showFailure(): void {
    this.clearResults();
    const panel = new Graphics().roundRect(555, 330, 490, 220, 28).fill(0xfff4df).stroke({ color: 0x7b4b32, width: 5 });
    const title = centeredText(message("gacha.insufficientGems"), 800, 395, 25);
    const close = new CanvasButton({
      label: message("gacha.resultClose"),
      width: 180,
      height: 56,
      color: 0xd7ad7e,
      onPress: () => this.clearResults(),
    });
    close.position.set(710, 455);
    this.resultLayer.addChild(createBlocker(), panel, title, close);
  }

  private showResults(result: Extract<GachaDrawResult, { ok: true }>): void {
    this.clearResults();
    const blocker = createBlocker();
    const panel = new Graphics().roundRect(310, 105, 980, 690, 34).fill(0xfff4df).stroke({ color: 0x7b4b32, width: 6 });
    const title = centeredText(message("gacha.resultTitle", { count: result.rewards.length }), 800, 155, 30);
    const guide = centeredText(message("gacha.resultStored"), 800, 198, 18);
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
        height: 58,
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
      height: 58,
      color: 0xd7ad7e,
      onPress: () => this.clearResults(),
    });
    close.position.set(700, 715);
    this.resultLayer.addChild(close);
  }

  private addResultCard(reward: GachaReward, index: number, total: number): void {
    const columns = total === 1 ? 1 : 4;
    const cardWidth = total === 1 ? 280 : 205;
    const x = total === 1 ? 660 : 370 + (index % columns) * 220;
    const y = total === 1 ? 280 : 235 + Math.floor(index / columns) * 145;
    const card = new Graphics()
      .roundRect(x, y, cardWidth, total === 1 ? 300 : 130, 20)
      .fill(rarityColor(reward.rarity))
      .stroke({ color: 0x8a5738, width: 3 });
    const rarity = new Text({ text: reward.rarity, style: textStyle(16, 0x70442b, "800") });
    rarity.position.set(x + 12, y + 10);
    const art = rewardArt(reward.id);
    art.scale.set(total === 1 ? 1.15 : 0.58);
    art.position.set(x + cardWidth / 2, y + (total === 1 ? 145 : 65));
    const rewardName = message(rewardNameMessages[reward.id]);
    const name = centeredText(rewardName, x + cardWidth / 2, y + (total === 1 ? 245 : 105), total === 1 ? 20 : 14);
    this.resultLayer.addChild(card, rarity, art, name);
    if (reward.duplicate) {
      const duplicate = centeredText(
        message("gacha.duplicateExchange", { amount: reward.exchangeGems }),
        x + cardWidth / 2,
        y + (total === 1 ? 275 : 120),
        total === 1 ? 16 : 12,
      );
      this.resultLayer.addChild(duplicate);
    }
  }

  private clearResults(): void {
    this.resultLayer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
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

function pickupArt(index: number): Graphics {
  if (index === 0) {
    return drawMiniCat(0x343434);
  }
  if (index === 1) {
    return drawDesk();
  }
  return drawCatTower();
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
  const blocker = new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill({ color: 0x2b1b13, alpha: 0.5 });
  blocker.eventMode = "static";
  return blocker;
}

function rarityColor(rarity: GachaReward["rarity"]): number {
  if (rarity === "SSR") {
    return 0xffdda0;
  }
  if (rarity === "SR") {
    return 0xead4ef;
  }
  if (rarity === "R") {
    return 0xd8e8f4;
  }
  return 0xffead0;
}

const rewardNameMessages: Record<GachaRewardId, MessageId> = {
  "cat.ink": "gacha.blackCat",
  "furniture.desk": "gacha.studyDesk",
  "furniture.catTower": "gacha.miniCatTower",
  "decor.plant": "shop.productPlant",
  "furniture.sofa": "shop.productSofa",
};
