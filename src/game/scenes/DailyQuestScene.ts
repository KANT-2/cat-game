import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GameState } from "../../domain/room";
import { CanvasButton } from "../components/CanvasButton";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type DailyQuestSceneOptions = {
  getState: () => GameState;
  onBack: () => void;
  onQuest: () => void;
  onClaimAll: () => void;
};

const questRows: Array<{ topic: MessageId; prompt: MessageId; reward: number }> = [
  { topic: "daily.topicPrint", prompt: "daily.promptPrint", reward: 50 },
  { topic: "daily.topicVariable", prompt: "daily.promptVariable", reward: 60 },
  { topic: "daily.topicString", prompt: "daily.promptString", reward: 60 },
];

export class DailyQuestScene extends Container {
  private readonly content = new Container();

  constructor(options: DailyQuestSceneOptions) {
    super();
    this.addChild(this.content);
    this.buildBackground();
    this.buildHeader(options);
    this.buildProgress();
    this.buildQuestList(options.onQuest);
    this.buildRewards(options.onClaimAll);
  }

  layout(width: number, height: number): void {
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    this.content.scale.set(scale);
    this.content.position.set((width - BASE_WIDTH * scale) / 2, (height - BASE_HEIGHT * scale) / 2);
  }

  private buildBackground(): void {
    this.content.addChild(
      new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill(0xf8e7ca).rect(0, 770, BASE_WIDTH, 130).fill(0xe1b27f),
    );
  }

  private buildHeader(options: DailyQuestSceneOptions): void {
    const back = new CanvasButton({
      label: message("daily.back"),
      width: 82,
      height: 68,
      color: 0xf2c18a,
      onPress: options.onBack,
    });
    back.position.set(24, 20);
    const title = new Text({ text: message("daily.title"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(130, 34);
    const state = options.getState();
    const currency = new Graphics()
      .roundRect(1090, 20, 470, 62, 25)
      .fill(0xf1d3aa)
      .stroke({ color: 0x70442b, width: 4 });
    const coin = new Graphics().circle(1130, 51, 22).fill(0xf5bd39).stroke({ color: 0xa4601f, width: 4 });
    const banknote = new Graphics()
      .roundRect(1340, 32, 52, 38, 7)
      .fill(0x75a844)
      .stroke({ color: 0x365b2b, width: 3 })
      .circle(1366, 51, 9)
      .fill(0xd9e98d)
      .stroke({ color: 0x4f7c34, width: 2 });
    const coins = new Text({ text: state.coins.toLocaleString(), style: textStyle(21, 0x3d2b22, "800") });
    coins.anchor.set(1, 0.5);
    coins.position.set(1310, 51);
    const gems = new Text({ text: String(state.gems), style: textStyle(21, 0x3d2b22, "800") });
    gems.anchor.set(1, 0.5);
    gems.position.set(1528, 51);
    this.content.addChild(back, title, currency, coin, banknote, coins, gems);
  }

  private buildProgress(): void {
    const panel = new Graphics().roundRect(55, 110, 350, 650, 26).fill(0xfff2dc).stroke({ color: 0x9b623c, width: 4 });
    const heading = new Text({ text: message("daily.learnedToday"), style: textStyle(24, 0x543321, "800") });
    heading.anchor.set(0.5);
    heading.position.set(230, 155);
    this.content.addChild(panel, heading);
    const topics: Array<{ icon: string; label: MessageId }> = [
      { icon: "P", label: "daily.topicPrint" },
      { icon: "x", label: "daily.topicVariable" },
      { icon: "“”", label: "daily.topicString" },
    ];
    topics.forEach((topic, index) => {
      const row = new Graphics()
        .roundRect(82, 190 + index * 78, 296, 62, 15)
        .fill(0xfff8ea)
        .stroke({ color: 0xc99a69, width: 2 });
      const badge = new Graphics()
        .roundRect(98, 204 + index * 78, 38, 34, 8)
        .fill(index === 0 ? 0x333941 : 0xd79b5d)
        .stroke({ color: 0x65432d, width: 2 });
      const icon = new Text({ text: topic.icon, style: textStyle(16, index === 0 ? 0xdcea83 : 0x4b3021, "800") });
      icon.anchor.set(0.5);
      icon.position.set(117, 221 + index * 78);
      const label = new Text({ text: message(topic.label), style: textStyle(18, 0x3d2b22, "700") });
      label.position.set(153, 210 + index * 78);
      const check = new Text({ text: "✓", style: textStyle(26, 0x789944, "800") });
      check.position.set(334, 205 + index * 78);
      this.content.addChild(row, badge, icon, label, check);
    });
    const progressTitle = new Text({
      text: message("daily.progress", { done: 3, total: 5 }),
      style: textStyle(24, 0x4b3021, "800"),
    });
    progressTitle.position.set(110, 466);
    const progressBar = new Graphics()
      .roundRect(110, 510, 240, 20, 10)
      .fill(0x76503a)
      .roundRect(110, 510, 144, 20, 10)
      .fill(0x8ca56d);
    const streak = new Text({
      text: message("daily.streak", { days: 7 }),
      style: { ...textStyle(20, 0x4b3021, "800"), align: "center", lineHeight: 30 },
    });
    streak.anchor.set(0.5);
    streak.position.set(230, 630);
    this.content.addChild(progressTitle, progressBar, streak);
  }

  private buildQuestList(onQuest: () => void): void {
    const panel = new Graphics().roundRect(430, 100, 920, 635, 26).fill(0xfff7e7).stroke({ color: 0x895636, width: 5 });
    const title = new Text({ text: message("daily.reviewTitle"), style: textStyle(27, 0x4b2d1d, "800") });
    title.position.set(485, 126);
    const subtitle = new Text({ text: message("daily.reviewSubtitle"), style: textStyle(16, 0x77533d, "600") });
    subtitle.position.set(485, 163);
    this.content.addChild(panel, title, subtitle);
    questRows.forEach((quest, index) => {
      const y = 205 + index * 162;
      const row = new Graphics()
        .roundRect(455, y, 870, 145, 18)
        .fill(0xfff3dc)
        .stroke({ color: index === 0 ? 0xd58a35 : 0xd2b28e, width: 3 });
      const numberBadge = new Graphics()
        .roundRect(475, y + 18, 42, 42, 12)
        .fill(0xbd7b3e)
        .stroke({ color: 0x754526, width: 3 });
      const number = new Text({ text: String(index + 1), style: textStyle(20, 0xffffff, "800") });
      number.anchor.set(0.5);
      number.position.set(496, y + 39);
      const topic = new Text({ text: message(quest.topic), style: textStyle(18, 0x4b3021, "800") });
      topic.position.set(540, y + 20);
      const prompt = new Text({
        text: message(quest.prompt),
        style: { ...textStyle(17, 0x4b3021, "600"), lineHeight: 24 },
      });
      prompt.position.set(540, y + 58);
      const reward = new Text({
        text: message("daily.reward", { amount: quest.reward }),
        style: textStyle(18, 0x70451f, "800"),
      });
      reward.position.set(1115, y + 30);
      const solve = new CanvasButton({
        label: message("daily.solve"),
        width: 115,
        height: 46,
        color: index === 0 ? 0xffbd65 : 0xd7c3a9,
        onPress: onQuest,
      });
      solve.position.set(1165, y + 78);
      this.content.addChild(row, numberBadge, number, topic, prompt, reward, solve);
    });
    const cat = drawHappyCat();
    cat.position.set(1460, 480);
    this.content.addChild(cat);
  }

  private buildRewards(onClaimAll: () => void): void {
    const panel = new Graphics().roundRect(500, 755, 910, 125, 24).fill(0xffefd4).stroke({ color: 0x98603a, width: 4 });
    const title = new Text({ text: message("daily.allComplete"), style: textStyle(21, 0x4b3021, "800") });
    title.position.set(535, 779);
    const rewards = new Text({ text: message("daily.allRewards"), style: textStyle(18, 0x76503a, "700") });
    rewards.position.set(535, 823);
    const claim = new CanvasButton({
      label: message("daily.claimAll"),
      width: 205,
      height: 58,
      color: 0xf0a447,
      onPress: onClaimAll,
    });
    claim.position.set(1170, 788);
    this.content.addChild(panel, title, rewards, claim);
  }
}

function drawHappyCat(): Container {
  const cat = new Container();
  cat.addChild(
    new Graphics()
      .ellipse(0, 100, 70, 18)
      .fill({ color: 0x5a3b2c, alpha: 0.15 })
      .ellipse(0, 45, 50, 65)
      .fill(0xe99042)
      .stroke({ color: 0x563728, width: 4 })
      .circle(0, -15, 55)
      .fill(0xf0a052)
      .stroke({ color: 0x563728, width: 4 })
      .poly([-43, -48, -35, -86, -8, -60, 20, -60, 40, -88, 47, -43])
      .fill(0xf0a052)
      .stroke({ color: 0x563728, width: 4 })
      .moveTo(-24, -14)
      .bezierCurveTo(-18, -23, -10, -23, -5, -14)
      .moveTo(5, -14)
      .bezierCurveTo(10, -23, 18, -23, 24, -14)
      .stroke({ color: 0x3d2b22, width: 4, cap: "round" })
      .circle(0, 2, 4)
      .fill(0x6f4230),
  );
  const bubble = new Graphics()
    .roundRect(-105, -180, 210, 65, 22)
    .fill(0xffffff)
    .stroke({ color: 0x68442f, width: 3 })
    .poly([-10, -116, 5, -96, 18, -116])
    .fill(0xffffff)
    .stroke({ color: 0x68442f, width: 3 });
  const text = new Text({
    text: message("daily.catBubble"),
    style: { ...textStyle(16, 0x3d2b22, "700"), align: "center" },
  });
  text.anchor.set(0.5);
  text.position.set(0, -148);
  cat.addChild(bubble, text);
  return cat;
}
