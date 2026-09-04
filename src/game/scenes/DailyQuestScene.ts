import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { DailyQuestView, DailyRewardResult } from "../../core/GameClient";
import type { DailyQuestId } from "../../domain/dailyQuest";
import type { GameState } from "../../domain/room";
import { BackButton } from "../components/BackButton";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPageBackground, createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { createCoinAmount, createCurrencyBar } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type DailyQuestSceneOptions = {
  getState: () => GameState;
  getQuests: () => DailyQuestView[];
  onBack: () => void;
  onOpenStudy: () => void;
  onClaim: (questId: DailyQuestId) => DailyRewardResult;
  onClaimBonus: () => DailyRewardResult;
  backIcon: string;
  coinIcon: string;
};

/** 저장된 오늘의 학습 기록과 보상 수령 상태를 보여 주는 전체 화면 장면이다. */
export class DailyQuestScene extends Container {
  private readonly content = new Container();
  private readonly options: DailyQuestSceneOptions;
  private readonly status = new Text({ text: "", style: textStyle(17, 0x55734d, "700") });

  constructor(options: DailyQuestSceneOptions) {
    super();
    this.options = options;
    this.addChild(this.content);
    this.render();
  }

  layout(width: number, height: number): void {
    layoutToFillViewport(this.content, width, height);
  }

  private render(): void {
    this.content.removeChildren().forEach((child) => {
      if (child !== this.status) {
        child.destroy({ children: true });
      }
    });
    const quests = this.options.getQuests();
    const state = this.options.getState();
    const completed = quests.filter((quest) => quest.complete).length;
    this.buildBackground();
    this.buildHeader(state);
    this.buildSummary(completed, quests.length);
    this.buildQuestList(quests);
    this.buildBonus(quests, state.dailyBonusClaimed);
    this.buildFairnessNotice();
    this.status.anchor.set(0.5);
    this.status.position.set(965, 868);
    this.content.addChild(this.status);
  }

  private buildBackground(): void {
    this.content.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT));
  }

  private buildHeader(state: GameState): void {
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 72, onPress: this.options.onBack });
    back.position.set(24, 20);
    const title = new Text({ text: message("daily.title"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(130, 22);
    const subtitle = new Text({ text: message("daily.subtitle"), style: textStyle(16, 0x76533d, "600") });
    subtitle.position.set(132, 66);
    const ornament = createTitleOrnament(132, 89, 170);
    const currency = createCurrencyBar(this.options.coinIcon, state.coins);
    currency.container.position.set(1240, 20);
    this.content.addChild(back, title, subtitle, ornament, currency.container);
  }

  private buildSummary(done: number, total: number): void {
    const panel = createCozyPanel(55, 125, 360, 560, { fill: 0xfff4df, border: 0xa66b43, radius: 28 });
    const title = new Text({ text: message("daily.todayProgress"), style: textStyle(23, 0x493022, "800") });
    title.anchor.set(0.5);
    title.position.set(235, 170);
    const ring = new Graphics()
      .circle(239, 316, 112)
      .fill({ color: 0x603820, alpha: 0.15 })
      .circle(235, 310, 108)
      .fill(0xffefd3)
      .stroke({ color: 0xa96f43, width: 4 })
      .circle(235, 310, 92)
      .fill(0xf1dfc6)
      .stroke({ color: 0xcda273, width: 16 });
    const ratio = total === 0 ? 0 : done / total;
    const progressRing = new Graphics();
    if (ratio > 0) {
      const startAngle = -Math.PI / 2;
      progressRing
        .moveTo(235 + Math.cos(startAngle) * 104, 310 + Math.sin(startAngle) * 104)
        .arc(235, 310, 104, startAngle, startAngle + Math.PI * 2 * ratio)
        .stroke({ color: 0x82a367, width: 18 });
    }
    const count = new Text({
      text: message("daily.completedCount", { done, total }),
      style: textStyle(28, 0x493022, "800"),
    });
    count.anchor.set(0.5);
    count.position.set(235, 310);
    const streakCard = new Graphics()
      .roundRect(90, 465, 290, 105, 20)
      .fill(0xffe8bf)
      .stroke({ color: 0xd39b5d, width: 2 });
    const streak = new Text({
      text: message("daily.streak", { days: 7 }),
      style: { ...textStyle(20, 0x67432d, "800"), align: "center", lineHeight: 30 },
    });
    streak.anchor.set(0.5);
    streak.position.set(235, 518);
    const study = new CanvasButton({
      label: message("daily.goStudy"),
      width: 250,
      height: 60,
      color: 0xe9a14b,
      onPress: this.options.onOpenStudy,
    });
    study.position.set(110, 602);
    this.content.addChild(panel, title, ring, progressRing, count, streakCard, streak, study);
  }

  private buildQuestList(quests: DailyQuestView[]): void {
    const panel = createCozyPanel(445, 125, 1110, 560, { fill: 0xfff8e9, border: 0x95603d, radius: 28 });
    const heading = new Text({ text: message("daily.reviewTitle"), style: textStyle(25, 0x493022, "800") });
    heading.position.set(490, 155);
    this.content.addChild(panel, heading);
    quests.forEach((quest, index) => {
      const y = 210 + index * 145;
      const complete = quest.complete;
      const row = new Graphics()
        .roundRect(480, y, 1040, 120, 20)
        .fill(complete ? 0xf1f3df : 0xfff0d8)
        .stroke({ color: complete ? 0x89a46c : 0xd2a16d, width: 3 });
      const icon = new Graphics()
        .circle(535, y + 60, 34)
        .fill(complete ? 0x7f9e67 : 0xd99b5b)
        .stroke({ color: 0x68452f, width: 3 });
      const iconText = new Text({ text: complete ? "✓" : String(index + 1), style: textStyle(20, 0xffffff, "800") });
      iconText.anchor.set(0.5);
      iconText.position.set(535, y + 60);
      const title = new Text({ text: message(quest.titleMessage), style: textStyle(20, 0x493022, "800") });
      title.position.set(590, y + 22);
      const description = new Text({ text: message(quest.descriptionMessage), style: textStyle(15, 0x76533c, "600") });
      description.position.set(590, y + 57);
      const progressTrack = new Graphics().roundRect(590, y + 89, 320, 12, 6).fill(0xddc8ad);
      const progressWidth = quest.target === 0 ? 0 : (320 * quest.progress) / quest.target;
      if (progressWidth > 0) {
        progressTrack.roundRect(590, y + 89, Math.max(12, progressWidth), 12, 6).fill(0x82a367);
      }
      const progress = new Text({
        text: message("daily.progressValue", { progress: quest.progress, target: quest.target }),
        style: textStyle(14, 0x674631, "800"),
      });
      progress.position.set(930, y + 80);
      const rewardLabel = new Text({ text: message("daily.rewardLabel"), style: textStyle(16, 0x7b542f, "800") });
      rewardLabel.anchor.set(0, 0.5);
      rewardLabel.position.set(1060, y + 36);
      const reward = createCoinAmount(this.options.coinIcon, `+${quest.rewardCoins}`, {
        color: 0x7b542f,
        fontSize: 16,
        iconSize: 24,
        gap: 6,
      });
      reward.position.set(1060 + rewardLabel.width + 16, y + 36);
      let actionLabel: "daily.claimed" | "daily.claim" | "daily.goStudy" = "daily.goStudy";
      let actionColor = 0xadc08d;
      if (quest.claimed) {
        actionLabel = "daily.claimed";
        actionColor = 0xb8b2a5;
      } else if (complete) {
        actionLabel = "daily.claim";
        actionColor = 0xe8a04b;
      }
      const action = new CanvasButton({
        label: message(actionLabel),
        width: 175,
        height: 50,
        color: actionColor,
        onPress: () => this.handleQuestAction(quest),
      });
      action.position.set(1305, y + 47);
      this.content.addChild(
        row,
        icon,
        iconText,
        title,
        description,
        progressTrack,
        progress,
        rewardLabel,
        reward,
        action,
      );
    });
  }

  private buildBonus(quests: DailyQuestView[], claimed: boolean): void {
    const allClaimed = quests.every((quest) => quest.claimed);
    const panel = createCozyPanel(55, 715, 1020, 120, { fill: 0xffedc9, border: 0xb67a43 });
    const title = new Text({ text: message("daily.allComplete"), style: textStyle(21, 0x493022, "800") });
    title.position.set(92, 742);
    const rewards = createCoinAmount(this.options.coinIcon, message("daily.allRewards"), {
      color: 0x76503a,
      fontSize: 17,
      iconSize: 26,
      gap: 7,
    });
    rewards.position.set(92, 794);
    let actionColor = 0xc9b9a3;
    if (claimed) {
      actionColor = 0xb8b2a5;
    } else if (allClaimed) {
      actionColor = 0xeaa14b;
    }
    const action = new CanvasButton({
      label: message(claimed ? "daily.claimed" : "daily.claimAll"),
      width: 220,
      height: 58,
      color: actionColor,
      onPress: () => this.claimBonus(),
    });
    action.position.set(820, 745);
    this.content.addChild(panel, title, rewards, action);
  }

  private buildFairnessNotice(): void {
    const panel = createCozyPanel(1100, 715, 455, 120, { fill: 0xeef1dd, border: 0x8aa16d });
    const title = new Text({ text: message("daily.fairnessTitle"), style: textStyle(17, 0x4f673d, "800") });
    title.position.set(1125, 735);
    const notice = new Text({
      text: message("daily.fairnessNotice"),
      style: { ...textStyle(13, 0x596549, "600"), wordWrap: true, wordWrapWidth: 405, lineHeight: 19 },
    });
    notice.position.set(1125, 765);
    this.content.addChild(panel, title, notice);
  }

  private handleQuestAction(quest: DailyQuestView): void {
    if (quest.claimed) {
      return;
    }
    if (!quest.complete) {
      this.options.onOpenStudy();
      return;
    }
    const result = this.options.onClaim(quest.id);
    if (result.ok) {
      this.render();
      this.status.text = message("daily.rewardReceived", { amount: result.coinsAwarded });
    }
  }

  private claimBonus(): void {
    const result = this.options.onClaimBonus();
    if (!result.ok) {
      this.status.text = message("daily.bonusLocked");
      return;
    }
    this.render();
    this.status.text = message("daily.bonusReceived", { amount: result.coinsAwarded });
  }
}
