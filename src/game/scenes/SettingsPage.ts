import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { GameSettings, GameState } from "../../domain/room";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { textStyle } from "../config";

type SettingsSection = "account" | "sound" | "alerts" | "learning";
type SettingsPageMode = "settings" | "account";
type ConfirmAction = "dataReset" | "accountDelete" | "learningReset";

type SettingsPageOptions = {
  mode: SettingsPageMode;
  onStatus: (id: MessageId) => void;
  onOpenAttendance: () => void;
  getState: () => GameState;
  onUpdateSettings: (patch: Partial<GameSettings>) => GameSettings;
  onResetLearning: () => void;
};

const settingsSections: readonly SettingsSection[] = ["sound", "alerts", "learning"];

/** 설정 카테고리 탐색과 각 카테고리의 Canvas 컨트롤을 한 화면에서 관리한다. */
export class SettingsPage extends Container {
  private activeSection: SettingsSection;
  private confirmAction: ConfirmAction | null = null;
  private bgmEnabled: boolean;
  private bgmVolume: number;
  private effectsEnabled: boolean;
  private effectsVolume: number;
  private dailyQuestAlerts = true;
  private studyAlerts = true;
  private rewardAlerts = true;
  private quietHours = true;
  private subjectIndex = 0;
  private hintsEnabled = true;
  private explanationsEnabled = true;
  private dailyGoal = 5;

  constructor(private readonly options: SettingsPageOptions) {
    super();
    this.activeSection = options.mode === "account" ? "account" : "sound";
    const settings = options.getState().settings;
    this.bgmEnabled = settings.bgmEnabled;
    this.bgmVolume = settings.bgmVolume;
    this.effectsEnabled = settings.effectsEnabled;
    this.effectsVolume = settings.effectsVolume;
    this.render();
  }

  private render(): void {
    this.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    const panelX = this.options.mode === "account" ? 28 : 335;
    const panelWidth = this.options.mode === "account" ? 1532 : 1225;
    this.addChild(createCozyPanel(panelX, 120, panelWidth, 715, { fill: 0xfff0dc, border: 0x9a633e, radius: 28 }));
    this.renderNavigation();
    this.renderHeader();
    if (this.activeSection === "account") {
      this.renderAccount();
    } else if (this.activeSection === "sound") {
      this.renderSound();
    } else if (this.activeSection === "alerts") {
      this.renderAlerts();
    } else {
      this.renderLearning();
    }
    if (this.confirmAction) {
      this.renderConfirmation(this.confirmAction);
    }
  }

  private renderNavigation(): void {
    if (this.options.mode === "account") {
      return;
    }

    settingsSections.forEach((section, index) => {
      const button = new CanvasButton({
        label: message(sectionMessages[section].tab),
        width: 225,
        height: 58,
        color: section === this.activeSection ? 0xf0ad55 : 0xe9c9a4,
        onPress: () => {
          this.activeSection = section;
          this.confirmAction = null;
          this.render();
        },
      });
      button.position.set(53, 250 + index * 90);
      this.addChild(button);
    });
  }

  private renderHeader(): void {
    const section = sectionMessages[this.activeSection];
    const x = this.options.mode === "account" ? 70 : 375;
    const title = new Text({ text: message(section.title), style: textStyle(28, 0x493022, "800") });
    title.position.set(x, 145);
    const description = new Text({ text: message(section.description), style: textStyle(16, 0x76533c, "600") });
    description.position.set(x, 187);
    const ornament = createTitleOrnament(x, 214, 180);
    this.addChild(title, description, ornament);
    if (this.options.mode === "account") {
      const attendance = new CanvasButton({
        label: message("attendance.openStatus"),
        width: 220,
        height: 54,
        fontSize: 18,
        color: 0xe3c49f,
        onPress: this.options.onOpenAttendance,
      });
      attendance.position.set(1290, 155);
      this.addChild(attendance);
    }
  }

  private renderAccount(): void {
    this.addCard(70, 225, 710, 125);
    this.addLabel("settings.profileImage", 100, 245, 20);
    this.addDetail("settings.profileImageDescription", 100, 280);
    this.addActionButton("settings.change", 590, 253, 160, () => this.notify("settings.accountActionReady"));

    this.addCard(810, 225, 710, 125);
    this.addLabel("settings.nickname", 840, 245, 20);
    this.addDetail("settings.nicknameValue", 840, 280);
    this.addActionButton("settings.change", 1330, 253, 160, () => this.notify("settings.accountActionReady"));

    this.addCard(70, 370, 1450, 125);
    this.addLabel("settings.accountLink", 100, 390, 20);
    this.addDetail("settings.accountLinkDescription", 100, 448);
    this.addActionButton("settings.linkGoogle", 1200, 385, 135, () => this.notify("settings.linkReady"));
    this.addActionButton("settings.linkEmail", 1350, 385, 140, () => this.notify("settings.linkReady"));

    this.addCard(70, 515, 1450, 75);
    this.addLabel("settings.lastSync", 100, 535, 18);
    this.addDetail("settings.lastSyncValue", 420, 536);

    const danger = new Graphics()
      .roundRect(70, 610, 1450, 185, 24)
      .fill(0xffe1d5)
      .stroke({ color: 0xb65d49, width: 3 });
    const title = new Text({ text: message("settings.dangerZone"), style: textStyle(21, 0x8c3429, "800") });
    title.position.set(100, 630);
    const detail = new Text({ text: message("settings.dangerDescription"), style: textStyle(15, 0x7e5148, "600") });
    detail.position.set(100, 667);
    this.addChild(danger, title, detail);
    this.addActionButton("settings.logout", 400, 715, 250, () => this.notify("settings.logoutReady"), 0xe7b080);
    this.addActionButton("settings.dataReset", 675, 715, 250, () => this.askConfirmation("dataReset"), 0xe58c72);
    this.addActionButton(
      "settings.accountDelete",
      950,
      715,
      250,
      () => this.askConfirmation("accountDelete"),
      0xd96c5b,
    );
  }

  private renderSound(): void {
    this.addSoundControlRow(
      245,
      "settings.bgm",
      "settings.bgmDescription",
      this.bgmEnabled,
      this.bgmVolume,
      () => {
        this.bgmEnabled = !this.bgmEnabled;
        this.options.onUpdateSettings({ bgmEnabled: this.bgmEnabled });
      },
      (delta) => {
        this.bgmVolume = clampVolume(this.bgmVolume + delta);
        this.options.onUpdateSettings({ bgmVolume: this.bgmVolume });
      },
    );
    this.addSoundControlRow(
      435,
      "settings.effects",
      "settings.effectsDescription",
      this.effectsEnabled,
      this.effectsVolume,
      () => {
        this.effectsEnabled = !this.effectsEnabled;
        this.options.onUpdateSettings({ effectsEnabled: this.effectsEnabled });
      },
      (delta) => {
        this.effectsVolume = clampVolume(this.effectsVolume + delta);
        this.options.onUpdateSettings({ effectsVolume: this.effectsVolume });
      },
    );
    this.addNotice("settings.vibrationNotice", 655);
  }

  private renderAlerts(): void {
    this.addToggleRow(
      225,
      "settings.dailyQuestAlerts",
      "settings.dailyQuestAlertsDescription",
      this.dailyQuestAlerts,
      () => {
        this.dailyQuestAlerts = !this.dailyQuestAlerts;
      },
    );
    this.addToggleRow(345, "settings.studyAlerts", "settings.studyAlertsDescription", this.studyAlerts, () => {
      this.studyAlerts = !this.studyAlerts;
    });
    this.addToggleRow(465, "settings.rewardAlerts", "settings.rewardAlertsDescription", this.rewardAlerts, () => {
      this.rewardAlerts = !this.rewardAlerts;
    });
    this.addToggleRow(585, "settings.quietHours", "settings.quietHoursDescription", this.quietHours, () => {
      this.quietHours = !this.quietHours;
    });
    this.addNotice("settings.notificationPermissionNotice", 705);
  }

  private renderLearning(): void {
    this.addSelectCard(
      370,
      245,
      "settings.subject",
      "settings.subjectDescription",
      subjectMessages[this.subjectIndex],
      () => {
        this.subjectIndex = (this.subjectIndex + 1) % subjectMessages.length;
      },
    );
    this.addGridToggle(950, 245, "settings.hints", "settings.hintsDescription", this.hintsEnabled, () => {
      this.hintsEnabled = !this.hintsEnabled;
    });
    this.addGridToggle(
      950,
      390,
      "settings.explanations",
      "settings.explanationsDescription",
      this.explanationsEnabled,
      () => {
        this.explanationsEnabled = !this.explanationsEnabled;
      },
    );
    this.addGoalCard(370, 390);
    this.addDangerCard(370, 550, "settings.learningReset", "settings.learningResetDescription", "settings.reset", () =>
      this.askConfirmation("learningReset"),
    );
  }

  private addToggleRow(y: number, label: MessageId, detail: MessageId, value: boolean, toggle: () => void): void {
    this.addCard(370, y, 1150, 100);
    this.addLabel(label, 400, y + 18, 20);
    this.addDetail(detail, 400, y + 54);
    this.addActionButton(
      value ? "settings.on" : "settings.off",
      1330,
      y + 23,
      160,
      () => this.change(toggle),
      value ? 0x83a66a : 0xc7aa91,
    );
  }

  private addSoundControlRow(
    y: number,
    label: MessageId,
    detail: MessageId,
    enabled: boolean,
    value: number,
    toggle: () => void,
    changeVolume: (delta: number) => void,
  ): void {
    this.addCard(370, y, 1150, 150);
    this.addLabel(label, 400, y + 24, 22);
    this.addDetail(detail, 400, y + 66);
    this.addActionButton(
      enabled ? "settings.on" : "settings.off",
      1050,
      y + 50,
      150,
      () => this.change(toggle),
      enabled ? 0x83a66a : 0xc7aa91,
    );
    this.addActionButton("settings.decrease", 1230, y + 50, 55, () => this.change(() => changeVolume(-10)));
    const amount = new Text({ text: message("settings.percent", { value }), style: textStyle(18, 0x493022, "800") });
    amount.anchor.set(0.5);
    amount.position.set(1360, y + 73);
    this.addActionButton("settings.increase", 1435, y + 50, 55, () => this.change(() => changeVolume(10)));
    this.addChild(amount);
  }

  private addSelectCard(
    x: number,
    y: number,
    label: MessageId,
    detail: MessageId,
    value: MessageId,
    select: () => void,
  ): void {
    this.addActionCard(x, y, label, detail, value, () => this.change(select));
  }

  private addGridToggle(
    x: number,
    y: number,
    label: MessageId,
    detail: MessageId,
    value: boolean,
    toggle: () => void,
  ): void {
    this.addActionCard(x, y, label, detail, value ? "settings.on" : "settings.off", () => this.change(toggle));
  }

  private addGoalCard(x: number, y: number): void {
    this.addCard(x, y, 555, 105);
    this.addLabel("settings.dailyGoal", x + 30, y + 18, 20);
    this.addDetail("settings.dailyGoalDescription", x + 30, y + 54);
    this.addActionButton("settings.decrease", x + 330, y + 31, 50, () =>
      this.change(() => {
        this.dailyGoal = Math.max(1, this.dailyGoal - 1);
      }),
    );
    const goal = new Text({
      text: message("settings.problemCount", { count: this.dailyGoal }),
      style: textStyle(17, 0x493022, "800"),
    });
    goal.anchor.set(0.5);
    goal.position.set(x + 435, y + 54);
    this.addActionButton("settings.increase", x + 475, y + 31, 50, () =>
      this.change(() => {
        this.dailyGoal = Math.min(20, this.dailyGoal + 1);
      }),
    );
    this.addChild(goal);
  }

  private addActionCard(
    x: number,
    y: number,
    label: MessageId,
    detail: MessageId,
    action: MessageId,
    onPress: () => void,
  ): void {
    this.addCard(x, y, 555, 105);
    this.addLabel(label, x + 30, y + 18, 19);
    this.addDetail(detail, x + 30, y + 52);
    this.addActionButton(action, x + 385, y + 31, 140, onPress);
  }

  private addDangerCard(
    x: number,
    y: number,
    label: MessageId,
    detail: MessageId,
    action: MessageId,
    onPress: () => void,
  ): void {
    const card = new Graphics().roundRect(x, y, 1150, 120, 22).fill(0xffe1d5).stroke({ color: 0xb65d49, width: 3 });
    this.addChild(card);
    this.addLabel(label, x + 30, y + 20, 20, 0x8c3429);
    this.addDetail(detail, x + 30, y + 58);
    this.addActionButton(action, x + 930, y + 34, 190, onPress, 0xd96c5b);
  }

  private addNotice(id: MessageId, y: number): void {
    const notice = new Text({ text: message(id), style: textStyle(15, 0x76533c, "600") });
    notice.anchor.set(0.5);
    notice.position.set(945, y + 25);
    this.addChild(notice);
  }

  private addCard(x: number, y: number, width: number, height: number): void {
    this.addChild(createCozyPanel(x, y, width, height, { fill: 0xfff8e9, border: 0xc38a58, radius: 22 }));
  }

  private addLabel(id: MessageId, x: number, y: number, size: number, color = 0x493022): void {
    const label = new Text({ text: message(id), style: textStyle(size, color, "800") });
    label.position.set(x, y);
    this.addChild(label);
  }

  private addDetail(id: MessageId, x: number, y: number): void {
    const detail = new Text({ text: message(id), style: textStyle(15, 0x76533c, "600") });
    detail.position.set(x, y);
    this.addChild(detail);
  }

  private addActionButton(
    id: MessageId,
    x: number,
    y: number,
    width: number,
    onPress: () => void,
    color = 0xe4bd8f,
  ): void {
    const button = new CanvasButton({ label: message(id), width, height: 46, color, onPress });
    button.position.set(x, y);
    this.addChild(button);
  }

  private change(change: () => void): void {
    change();
    this.notify("settings.changed");
    this.render();
  }

  private notify(id: MessageId): void {
    this.options.onStatus(id);
  }

  private askConfirmation(action: ConfirmAction): void {
    this.confirmAction = action;
    this.render();
  }

  private renderConfirmation(action: ConfirmAction): void {
    const blocker = new Graphics().rect(0, 0, 1600, 900).fill({ color: 0x2f211b, alpha: 0.58 });
    blocker.eventMode = "static";
    const panel = createCozyPanel(300, 155, 1000, 590, { fill: 0xfff4df, border: 0x9d4b3d, radius: 32 });
    const warningBadge = new Graphics().circle(800, 245, 48).fill(0xf6d7ad).stroke({ color: 0x9d4b3d, width: 4 });
    const warning = new Text({ text: "!", style: textStyle(45, 0x9d4b3d, "800") });
    warning.anchor.set(0.5);
    warning.position.set(800, 244);
    const title = new Text({ text: message(confirmMessages[action].title), style: textStyle(32, 0x742e27, "800") });
    title.anchor.set(0.5);
    title.position.set(800, 330);
    const detail = new Text({
      text: message(confirmMessages[action].description),
      style: { ...textStyle(20, 0x654238, "600"), align: "center", lineHeight: 34 },
    });
    detail.anchor.set(0.5);
    detail.position.set(800, 420);
    const cancel = new CanvasButton({
      label: message("settings.cancel"),
      width: 220,
      height: 64,
      fontSize: 20,
      color: 0xd7b28c,
      onPress: () => {
        this.confirmAction = null;
        this.render();
      },
    });
    cancel.position.set(535, 555);
    const confirm = new CanvasButton({
      label: message("settings.confirm"),
      width: 220,
      height: 64,
      fontSize: 20,
      color: 0xd96c5b,
      onPress: () => {
        this.confirmAction = null;
        if (action === "learningReset") {
          this.options.onResetLearning();
        }
        this.notify(confirmMessages[action].status);
        this.render();
      },
    });
    confirm.position.set(845, 555);
    this.addChild(blocker, panel, warningBadge, warning, title, detail, cancel, confirm);
  }
}

const sectionMessages: Record<SettingsSection, { tab: MessageId; title: MessageId; description: MessageId }> = {
  account: { tab: "settings.tabAccount", title: "settings.accountTitle", description: "settings.accountDescription" },
  sound: { tab: "settings.tabSound", title: "settings.soundTitle", description: "settings.soundPageDescription" },
  alerts: { tab: "settings.tabAlerts", title: "settings.alertsTitle", description: "settings.alertsDescription" },
  learning: {
    tab: "settings.tabLearning",
    title: "settings.learningTitle",
    description: "settings.learningDescription",
  },
};

const confirmMessages: Record<ConfirmAction, { title: MessageId; description: MessageId; status: MessageId }> = {
  dataReset: {
    title: "settings.confirmDataResetTitle",
    description: "settings.confirmDataResetDescription",
    status: "settings.accountActionReady",
  },
  accountDelete: {
    title: "settings.confirmAccountDeleteTitle",
    description: "settings.confirmAccountDeleteDescription",
    status: "settings.accountActionReady",
  },
  learningReset: {
    title: "settings.confirmLearningResetTitle",
    description: "settings.confirmLearningResetDescription",
    status: "settings.learningResetReady",
  },
};

const subjectMessages: readonly MessageId[] = [
  "settings.subjectPython",
  "settings.subjectJavaScript",
  "settings.subjectWeb",
];
function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, value));
}
