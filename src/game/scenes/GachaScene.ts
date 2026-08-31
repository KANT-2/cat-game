import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { GameState } from "../../domain/room";
import { CanvasButton } from "../components/CanvasButton";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type GachaSceneOptions = { getState: () => GameState; onBack: () => void; onDraw: () => void };

export class GachaScene extends Container {
  private readonly content = new Container();

  constructor(options: GachaSceneOptions) {
    super();
    this.addChild(this.content);
    this.content.addChild(
      new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(0xf8e5c5).rect(0, 680, BASE_WIDTH, 220).fill(0xdca76e),
    );
    this.buildHeader(options);
    this.buildPickup();
    this.buildMachine();
    this.buildRewards();
    this.buildDrawButtons(options.onDraw);
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
    const gems = new Text({ text: String(state.gems), style: textStyle(21, 0x3d2b22, "800") });
    gems.anchor.set(1, 0.5);
    gems.position.set(1528, 51);
    this.content.addChild(back, title, currency, coin, cash, coins, gems);
  }

  private buildPickup(): void {
    const panel = new Graphics().roundRect(42, 108, 470, 330, 24).fill(0xfff3dc).stroke({ color: 0x99603b, width: 4 });
    const heading = centeredText(message("gacha.pickup"), 277, 138, 23);
    this.content.addChild(panel, heading);
    const labels = [message("gacha.blackCat"), message("gacha.pawCushion"), message("gacha.studyDesk")];
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
      const x = 1215 + (index % 3) * 108;
      const y = 180 + Math.floor(index / 3) * 150;
      const cell = new Graphics().roundRect(x, y, 94, 130, 12).fill(0xffead0).stroke({ color: 0xc38a58, width: 2 });
      const art = rewardArt(index);
      art.scale.set(0.58);
      art.position.set(x + 47, y + 64);
      const rarity = new Text({
        text: rewardRarity(index),
        style: textStyle(13, 0x70442b, "800"),
      });
      rarity.position.set(x + 7, y + 6);
      this.content.addChild(cell, art, rarity);
    }
  }

  private buildDrawButtons(onDraw: () => void): void {
    const once = new CanvasButton({
      label: message("gacha.drawOnce"),
      width: 270,
      height: 84,
      color: 0xcddf91,
      onPress: onDraw,
    });
    once.position.set(505, 745);
    const ten = new CanvasButton({
      label: message("gacha.drawTen"),
      width: 300,
      height: 84,
      color: 0xf3ad54,
      onPress: onDraw,
    });
    ten.position.set(825, 745);
    const guarantee = centeredText(message("gacha.guarantee"), 800, 862, 17);
    this.content.addChild(once, ten, guarantee);
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
function drawPaw(): Graphics {
  return new Graphics()
    .circle(0, 8, 28)
    .fill(0xf4bc65)
    .stroke({ color: 0x855133, width: 3 })
    .circle(-24, -22, 10)
    .circle(-8, -32, 10)
    .circle(10, -32, 10)
    .circle(26, -20, 10)
    .fill(0xf4bc65)
    .stroke({ color: 0x855133, width: 2 });
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
    return drawPaw();
  }
  return drawDesk();
}

function rewardArt(index: number): Graphics {
  if (index % 3 === 0) {
    return drawMiniCat(index === 0 ? 0x333333 : 0xd69251);
  }
  if (index % 3 === 1) {
    return drawPaw();
  }
  return drawDesk();
}

function rewardRarity(index: number): string {
  if (index === 0) {
    return "SSR";
  }
  if (index < 3) {
    return "SR";
  }
  return "N";
}
