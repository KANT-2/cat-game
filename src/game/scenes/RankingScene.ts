import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GameState } from "../../domain/room";
import { CanvasButton } from "../components/CanvasButton";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type RankingSceneOptions = { getState: () => GameState; onBack: () => void; onRefresh: () => void };
const players: Array<{ name: MessageId; level: number; score: string; color: number; status: MessageId }> = [
  { name: "ranking.meowCoder", level: 10, score: "7,650", color: 0x333333, status: "ranking.statusStreak10" },
  { name: "ranking.helloPaws", level: 9, score: "6,980", color: 0xe69a50, status: "ranking.statusQuiz" },
  { name: "ranking.studyCat", level: 9, score: "6,120", color: 0xb2865e, status: "ranking.statusStreak7" },
  { name: "ranking.dataKitty", level: 8, score: "5,430", color: 0x777777, status: "ranking.statusPython" },
  { name: "ranking.codeCat", level: 8, score: "4,870", color: 0xf3eee2, status: "ranking.statusWeekly" },
  { name: "ranking.catLogic", level: 8, score: "4,320", color: 0xe8a04b, status: "ranking.statusStreak5" },
  { name: "ranking.player", level: 10, score: "4,050", color: 0xd99a5d, status: "ranking.statusStreak7" },
];

export class RankingScene extends Container {
  private readonly content = new Container();
  constructor(options: RankingSceneOptions) {
    super();
    this.addChild(this.content);
    this.content.addChild(new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(0xf8e6c8));
    this.buildHeader(options);
    this.buildSidebar();
    this.buildBoard(options.onRefresh);
  }
  layout(width: number, height: number): void {
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.content.scale.set(scale);
    this.content.position.set((width - BASE_WIDTH * scale) / 2, (height - BASE_HEIGHT * scale) / 2);
  }

  private buildHeader(options: RankingSceneOptions): void {
    const back = new CanvasButton({
      label: message("ranking.back"),
      width: 82,
      height: 68,
      color: 0xf1bd82,
      onPress: options.onBack,
    });
    back.position.set(24, 20);
    const title = new Text({ text: message("ranking.title"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(125, 34);
    const state = options.getState();
    const currency = new Graphics()
      .roundRect(1110, 20, 450, 62, 25)
      .fill(0xf1d3aa)
      .stroke({ color: 0x70442b, width: 4 });
    const coin = new Graphics().circle(1150, 51, 22).fill(0xf5bd39).stroke({ color: 0xa4601f, width: 4 });
    const cash = new Graphics().roundRect(1360, 32, 52, 38, 7).fill(0x75a844).stroke({ color: 0x365b2b, width: 3 });
    const coins = new Text({ text: state.coins.toLocaleString(), style: textStyle(21, 0x3d2b22, "800") });
    coins.anchor.set(1, 0.5);
    coins.position.set(1330, 51);
    const gems = new Text({ text: String(state.gems), style: textStyle(21, 0x3d2b22, "800") });
    gems.anchor.set(1, 0.5);
    gems.position.set(1528, 51);
    this.content.addChild(back, title, currency, coin, cash, coins, gems);
  }

  private buildSidebar(): void {
    const profile = new Graphics()
      .roundRect(20, 100, 290, 145, 22)
      .fill(0xffefd4)
      .stroke({ color: 0x9a623d, width: 4 });
    const cat = drawRankCat(0xd99a5d);
    cat.position.set(82, 158);
    const name = new Text({ text: message("ranking.player"), style: textStyle(20, 0x3d2b22, "800") });
    name.position.set(145, 125);
    const level = new Text({ text: message("home.level", { level: 10 }), style: textStyle(17, 0x4b3021, "700") });
    level.position.set(145, 174);
    this.content.addChild(profile, cat, name, level);
    const menu: MessageId[] = ["ranking.all", "ranking.friends", "ranking.weekly"];
    menu.forEach((id, index) => {
      const button = new CanvasButton({
        label: message(id),
        width: 285,
        height: 70,
        color: index === 0 ? 0xffb957 : 0xffeed5,
        onPress: () => undefined,
      });
      button.position.set(22, 270 + index * 88);
      this.content.addChild(button);
    });
    const bubble = new Graphics().roundRect(66, 570, 190, 75, 25).fill(0xffffff).stroke({ color: 0x74503a, width: 3 });
    const bubbleText = new Text({
      text: message("ranking.bubble"),
      style: { ...textStyle(16, 0x3d2b22, "700"), align: "center" },
    });
    bubbleText.anchor.set(0.5);
    bubbleText.position.set(161, 607);
    const mascot = drawRankCat(0xe8974c);
    mascot.scale.set(1.6);
    mascot.position.set(160, 755);
    this.content.addChild(bubble, bubbleText, mascot);
  }

  private buildBoard(onRefresh: () => void): void {
    const panel = new Graphics().roundRect(335, 90, 1235, 790, 28).fill(0xfff5e3).stroke({ color: 0x895636, width: 5 });
    this.content.addChild(panel);
    const tabs: MessageId[] = ["ranking.tabAll", "ranking.tabFriends", "ranking.tabWeekly"];
    tabs.forEach((id, index) => {
      const button = new CanvasButton({
        label: message(id),
        width: 160,
        height: 50,
        color: index === 0 ? 0xffb957 : 0xffeed5,
        onPress: () => undefined,
      });
      button.position.set(370 + index * 175, 112);
      this.content.addChild(button);
    });
    const refresh = new CanvasButton({
      label: message("ranking.refresh"),
      width: 145,
      height: 50,
      color: 0xf4d8b5,
      onPress: onRefresh,
    });
    refresh.position.set(1390, 112);
    this.content.addChild(refresh);
    this.buildPodium();
    const headers = new Text({ text: message("ranking.headers"), style: textStyle(16, 0x704b35, "700") });
    headers.position.set(405, 405);
    this.content.addChild(headers);
    players.forEach((player, index) => {
      const y = 438 + index * 58;
      const isMe = index === players.length - 1;
      const row = new Graphics()
        .roundRect(365, y, 1175, 52, 13)
        .fill(rankingRowColor(index, isMe))
        .stroke({ color: isMe ? 0xdc8c2d : 0xe3c7a6, width: isMe ? 3 : 1 });
      const rank = new Text({ text: String(index + 4), style: textStyle(18, 0x4b3021, "800") });
      rank.position.set(410, y + 14);
      const avatar = drawRankCat(player.color);
      avatar.scale.set(0.48);
      avatar.position.set(540, y + 27);
      const name = new Text({ text: message(player.name), style: textStyle(18, 0x3d2b22, "700") });
      name.position.set(585, y + 14);
      const level = new Text({
        text: message("home.level", { level: player.level }),
        style: textStyle(17, 0x4b3021, "600"),
      });
      level.position.set(900, y + 14);
      const score = new Text({ text: `● ${player.score}`, style: textStyle(18, 0xa56a15, "800") });
      score.position.set(1110, y + 14);
      const status = new Text({ text: message(player.status), style: textStyle(15, 0x55713d, "700") });
      status.position.set(1340, y + 15);
      this.content.addChild(row, rank, avatar, name, level, score, status);
    });
  }

  private buildPodium(): void {
    const podium = [
      { x: 735, color: 0x333333, rank: "1", name: "ranking.codeMeow" as const, score: "12,450" },
      { x: 500, color: 0xf1eee4, rank: "2", name: "ranking.pythonicat" as const, score: "10,230" },
      { x: 970, color: 0xa67950, rank: "3", name: "ranking.devCat" as const, score: "8,910" },
    ];
    podium.forEach((item, index) => {
      const card = new Graphics()
        .roundRect(item.x, 185, 230, 195, 24)
        .fill(podiumColor(index))
        .stroke({ color: 0xc59659, width: 3 });
      const cat = drawRankCat(item.color);
      cat.position.set(item.x + 70, 275);
      const rank = new Text({ text: item.rank, style: textStyle(30, 0x8a5a32, "800") });
      rank.position.set(item.x + 18, 198);
      const name = new Text({ text: message(item.name), style: textStyle(19, 0x3d2b22, "800") });
      name.position.set(item.x + 125, 235);
      const score = new Text({ text: `● ${item.score}`, style: textStyle(18, 0xa56a15, "800") });
      score.position.set(item.x + 125, 285);
      this.content.addChild(card, cat, rank, name, score);
    });
  }
}

function drawRankCat(color: number): Graphics {
  return new Graphics()
    .circle(0, 0, 42)
    .fill(color)
    .stroke({ color: 0x4b3125, width: 4 })
    .poly([-34, -25, -28, -61, -5, -36, 15, -36, 31, -62, 36, -23])
    .fill(color)
    .stroke({ color: 0x4b3125, width: 4 })
    .circle(-13, -2, 4)
    .circle(13, -2, 4)
    .fill(0x30231d)
    .circle(0, 10, 4)
    .fill(0x714330);
}

function rankingRowColor(index: number, isPlayer: boolean): number {
  if (isPlayer) {
    return 0xffd889;
  }
  return index % 2 === 0 ? 0xfff9ec : 0xffefd9;
}

function podiumColor(index: number): number {
  if (index === 0) {
    return 0xffe5a3;
  }
  if (index === 1) {
    return 0xe7edf2;
  }
  return 0xf4d3b0;
}
