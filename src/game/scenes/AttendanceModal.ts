import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { AttendanceClaimResult, AttendanceView } from "../../core/GameClient";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { createCoinAmount } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { textStyle } from "../config";

type AttendanceModalOptions = {
  getAttendance: () => AttendanceView;
  onClaim: () => AttendanceClaimResult;
  onClose: () => void;
  coinIcon: string;
};

const weekdayMessages = [
  "attendance.weekdaySun",
  "attendance.weekdayMon",
  "attendance.weekdayTue",
  "attendance.weekdayWed",
  "attendance.weekdayThu",
  "attendance.weekdayFri",
  "attendance.weekdaySat",
] as const;

/** 첫 일일 진입에서 월간 출석 기록과 연속 보상을 보여 주는 Canvas 모달이다. */
export class AttendanceModal extends Container {
  private readonly backdrop = new Graphics();
  private readonly content = new Container();
  private claimedCoins: number | null = null;

  constructor(private readonly options: AttendanceModalOptions) {
    super();
    this.backdrop.eventMode = "static";
    this.addChild(this.backdrop, this.content);
    this.render();
  }

  layout(width: number, height: number): void {
    this.backdrop.clear().rect(0, 0, width, height).fill({ color: 0x2f1b12, alpha: 0.62 });
    layoutToFillViewport(this.content, width, height);
  }

  private render(): void {
    this.content.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    const attendance = this.options.getAttendance();
    const date = dateFromStamp(attendance.today);
    const panel = createCozyPanel(160, 70, 1280, 760, {
      fill: 0xfff1d8,
      border: 0x855033,
      radius: 34,
      shadowAlpha: 0.34,
    });
    const title = new Text({ text: message("attendance.title"), style: textStyle(38, 0x4a2919, "800") });
    title.position.set(215, 103);
    const subtitle = new Text({ text: message("attendance.subtitle"), style: textStyle(17, 0x76533c, "600") });
    subtitle.position.set(218, 151);
    const ornament = createTitleOrnament(218, 178, 205);
    this.content.addChild(panel, title, subtitle, ornament);
    this.renderCalendar(attendance, date);
    this.renderRewardPanel(attendance);
  }

  private renderCalendar(attendance: AttendanceView, today: Date): void {
    const panel = createCozyPanel(205, 205, 815, 575, { fill: 0xfff9eb, border: 0xb77a4f, radius: 26 });
    const month = new Text({
      text: message("attendance.month", { year: today.getFullYear(), month: today.getMonth() + 1 }),
      style: textStyle(25, 0x493022, "800"),
    });
    month.anchor.set(0.5);
    month.position.set(612, 240);
    this.content.addChild(panel, month);

    weekdayMessages.forEach((id, index) => {
      let color = 0x76533c;
      if (index === 0) {
        color = 0xb65d49;
      } else if (index === 6) {
        color = 0x557a9b;
      }
      const label = new Text({
        text: message(id),
        style: textStyle(15, color, "800"),
      });
      label.anchor.set(0.5);
      label.position.set(282 + index * 110, 282);
      this.content.addChild(label);
    });

    const firstWeekday = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const claimed = new Set(attendance.claimedDates);
    for (let slot = 0; slot < 42; slot += 1) {
      const day = slot - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) {
        continue;
      }
      const column = slot % 7;
      const row = Math.floor(slot / 7);
      const x = 232 + column * 110;
      const y = 303 + row * 67;
      const stamp = dateStamp(today.getFullYear(), today.getMonth() + 1, day);
      const isToday = stamp === attendance.today;
      const isClaimed = claimed.has(stamp);
      let fillColor = 0xfffdf5;
      let borderColor = 0xddc3a4;
      if (isClaimed) {
        fillColor = 0xdce9c8;
        borderColor = 0x769257;
      } else if (isToday) {
        fillColor = 0xffdf9b;
        borderColor = 0xd68b36;
      }
      const cell = new Graphics()
        .roundRect(x, y, 100, 57, 14)
        .fill(fillColor)
        .stroke({ color: borderColor, width: isToday ? 3 : 2 });
      const number = new Text({ text: String(day), style: textStyle(16, 0x493022, "800") });
      number.position.set(x + 10, y + 7);
      this.content.addChild(cell, number);
      if (isClaimed) {
        const check = new Graphics().circle(x + 72, y + 29, 16).fill(0x82a367);
        const mark = new Text({ text: "✓", style: textStyle(18, 0xffffff, "800") });
        mark.anchor.set(0.5);
        mark.position.set(x + 72, y + 27);
        this.content.addChild(check, mark);
      } else if (isToday) {
        const todayLabel = new Text({ text: message("attendance.today"), style: textStyle(12, 0x9a552d, "800") });
        todayLabel.anchor.set(0.5);
        todayLabel.position.set(x + 67, y + 38);
        this.content.addChild(todayLabel);
      }
    }

    const guide = new Text({ text: message("attendance.calendarGuide"), style: textStyle(14, 0x76533c, "600") });
    guide.anchor.set(0.5);
    guide.position.set(612, 752);
    this.content.addChild(guide);
  }

  private renderRewardPanel(attendance: AttendanceView): void {
    const panel = createCozyPanel(1045, 205, 350, 575, { fill: 0xfff7e7, border: 0xb77a4f, radius: 26 });
    const streakTitle = new Text({ text: message("attendance.streakTitle"), style: textStyle(20, 0x76533c, "800") });
    streakTitle.anchor.set(0.5);
    streakTitle.position.set(1220, 242);
    const streak = new Text({
      text: message("attendance.streakDays", {
        count: attendance.canClaim ? attendance.nextStreak : attendance.currentStreak,
      }),
      style: textStyle(38, 0xd97937, "800"),
    });
    streak.anchor.set(0.5);
    streak.position.set(1220, 292);
    const longest = new Text({
      text: message("attendance.longestStreak", { count: attendance.longestStreak }),
      style: textStyle(15, 0x76533c, "600"),
    });
    longest.anchor.set(0.5);
    longest.position.set(1220, 330);
    const divider = new Graphics().roundRect(1090, 355, 260, 3, 2).fill(0xe4c59e);
    const rewardTitle = new Text({ text: message("attendance.todayReward"), style: textStyle(21, 0x493022, "800") });
    rewardTitle.anchor.set(0.5);
    rewardTitle.position.set(1220, 390);
    this.content.addChild(panel, streakTitle, streak, longest, divider, rewardTitle);

    this.addRewardRow(message("attendance.dailyReward"), attendance.dailyCoins, 425);
    this.addRewardRow(
      message("attendance.streakReward"),
      attendance.canClaim ? attendance.streakBonus : 0,
      474,
      attendance.streakBonus > 0,
    );

    const milestone = new Graphics()
      .roundRect(1090, 532, 260, 100, 18)
      .fill(0xffe7b8)
      .stroke({ color: 0xd39a55, width: 2 });
    const milestoneTitle = new Text({
      text: message("attendance.milestoneTitle"),
      style: textStyle(16, 0x704329, "800"),
    });
    milestoneTitle.anchor.set(0.5);
    milestoneTitle.position.set(1220, 554);
    const dayThree = new Text({
      text: message("attendance.milestone", {
        day: 3,
        amount: Math.max(0, (attendance.cycleRewards[2] ?? attendance.dailyCoins) - attendance.dailyCoins),
      }),
      style: textStyle(14, 0x76533c, "700"),
    });
    dayThree.position.set(1110, 579);
    const daySeven = new Text({
      text: message("attendance.milestone", {
        day: 7,
        amount: Math.max(0, (attendance.cycleRewards[6] ?? attendance.dailyCoins) - attendance.dailyCoins),
      }),
      style: textStyle(14, 0x76533c, "700"),
    });
    daySeven.position.set(1110, 603);
    this.content.addChild(milestone, milestoneTitle, dayThree, daySeven);

    let statusText = message("attendance.alreadyClaimed");
    let actionLabel = message("attendance.dismiss");
    if (this.claimedCoins !== null) {
      statusText = message("attendance.claimed", { amount: this.claimedCoins });
      actionLabel = message("attendance.close");
    } else if (attendance.canClaim) {
      statusText = message("attendance.ready", { amount: attendance.totalCoins });
      actionLabel = message("attendance.claim");
    }
    const status = new Text({
      text: statusText,
      style: { ...textStyle(14, 0x6c4b38, "700"), align: "center", wordWrap: true, wordWrapWidth: 275 },
    });
    status.anchor.set(0.5, 0);
    status.position.set(1220, 650);
    const action = new CanvasButton({
      label: actionLabel,
      width: 270,
      height: 58,
      fontSize: 18,
      color: this.claimedCoins === null ? 0xe9a14b : 0x8eaa72,
      onPress: () => this.handleAction(),
    });
    action.position.set(1085, 704);
    this.content.addChild(status, action);
  }

  private addRewardRow(labelValue: string, amount: number, y: number, highlighted = false): void {
    const label = new Text({ text: labelValue, style: textStyle(15, 0x604637, "700") });
    label.position.set(1095, y + 8);
    const value = createCoinAmount(this.options.coinIcon, `+${amount}`, {
      color: highlighted ? 0xd46f31 : 0x604637,
      fontSize: 17,
      iconSize: 28,
      gap: 7,
    });
    value.position.set(1350 - value.width, y + 18);
    this.content.addChild(label, value);
  }

  private handleAction(): void {
    if (this.claimedCoins !== null || !this.options.getAttendance().canClaim) {
      this.options.onClose();
      return;
    }
    const result = this.options.onClaim();
    if (!result.ok) {
      this.options.onClose();
      return;
    }
    this.claimedCoins = result.coinsAwarded;
    this.render();
  }
}

function dateFromStamp(stamp: string): Date {
  const [year, month, day] = stamp.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateStamp(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
