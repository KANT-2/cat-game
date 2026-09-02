import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import { CanvasButton } from "../components/CanvasButton";
import { textStyle } from "../config";

type SettingsSection = "account" | "sound" | "alerts" | "learning" | "display" | "support";
type ConfirmAction = "dataReset" | "accountDelete" | "learningReset";

type SettingsPageOptions = {
  onStatus: (id: MessageId) => void;
};

const sections: readonly SettingsSection[] = ["account", "sound", "alerts", "learning", "display", "support"];

/** 설정 카테고리 탐색과 각 카테고리의 Canvas 컨트롤을 한 화면에서 관리한다. */
export class SettingsPage extends Container {
  private activeSection: SettingsSection = "account";
  private confirmAction: ConfirmAction | null = null;
  private bgmEnabled = true;
  private bgmVolume = 70;
  private effectsEnabled = true;
  private effectsVolume = 80;
  private dailyQuestAlerts = true;
  private studyAlerts = true;
  private rewardAlerts = true;
  private quietHours = true;
  private subjectIndex = 0;
  private difficultyIndex = 0;
  private hintsEnabled = true;
  private explanationsEnabled = true;
  private dailyGoal = 5;
  private reducedMotion = false;
  private textSizeIndex = 1;
  private gradeLabels = true;

  constructor(private readonly options: SettingsPageOptions) {
    super();
    this.render();
  }

  private render(): void {
    this.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    this.addChild(
      new Graphics().roundRect(335, 120, 1225, 715, 28).fill(0xfff0dc).stroke({ color: 0x9a633e, width: 4 }),
    );
    this.renderNavigation();
    this.renderHeader();
    if (this.activeSection === "account") {
      this.renderAccount();
    } else if (this.activeSection === "sound") {
      this.renderSound();
    } else if (this.activeSection === "alerts") {
      this.renderAlerts();
    } else if (this.activeSection === "learning") {
      this.renderLearning();
    } else if (this.activeSection === "display") {
      this.renderDisplay();
    } else {
      this.renderSupport();
    }
    if (this.confirmAction) {
      this.renderConfirmation(this.confirmAction);
    }
  }

  private renderNavigation(): void {
    sections.forEach((section, index) => {
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
      button.position.set(53, 305 + index * 72);
      this.addChild(button);
    });
  }

  private renderHeader(): void {
    const section = sectionMessages[this.activeSection];
    const title = new Text({ text: message(section.title), style: textStyle(28, 0x493022, "800") });
    title.position.set(375, 145);
    const description = new Text({ text: message(section.description), style: textStyle(16, 0x76533c, "600") });
    description.position.set(375, 187);
    this.addChild(title, description);
  }

  private renderAccount(): void {
    this.addCard(370, 225, 555, 125);
    this.addLabel("settings.profileImage", 400, 245, 20);
    this.addDetail("settings.profileImageDescription", 400, 280);
    this.addActionButton("settings.change", 735, 253, 160, () => this.notify("settings.accountActionReady"));

    this.addCard(950, 225, 570, 125);
    this.addLabel("settings.nickname", 980, 245, 20);
    this.addDetail("settings.nicknameValue", 980, 280);
    this.addActionButton("settings.change", 1330, 253, 160, () => this.notify("settings.accountActionReady"));

    this.addCard(370, 370, 555, 125);
    this.addLabel("settings.uid", 400, 390, 20);
    this.addDetail("settings.uidValue", 400, 430);
    this.addActionButton("settings.copy", 735, 398, 160, () => this.notify("settings.copied"));

    this.addCard(950, 370, 570, 125);
    this.addLabel("settings.accountLink", 980, 390, 20);
    this.addDetail("settings.accountLinkDescription", 980, 448);
    this.addActionButton("settings.linkGoogle", 1200, 385, 135, () => this.notify("settings.linkReady"));
    this.addActionButton("settings.linkEmail", 1350, 385, 140, () => this.notify("settings.linkReady"));

    this.addCard(370, 515, 1150, 75);
    this.addLabel("settings.lastSync", 400, 535, 18);
    this.addDetail("settings.lastSyncValue", 720, 536);

    const danger = new Graphics()
      .roundRect(370, 610, 1150, 185, 24)
      .fill(0xffe1d5)
      .stroke({ color: 0xb65d49, width: 3 });
    const title = new Text({ text: message("settings.dangerZone"), style: textStyle(21, 0x8c3429, "800") });
    title.position.set(400, 630);
    const detail = new Text({ text: message("settings.dangerDescription"), style: textStyle(15, 0x7e5148, "600") });
    detail.position.set(400, 667);
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
    this.addToggleRow(225, "settings.bgm", "settings.bgmDescription", this.bgmEnabled, () => {
      this.bgmEnabled = !this.bgmEnabled;
    });
    this.addStepperRow(345, "settings.bgmVolume", "settings.bgmVolumeDescription", this.bgmVolume, (delta) => {
      this.bgmVolume = clampVolume(this.bgmVolume + delta);
    });
    this.addToggleRow(465, "settings.effects", "settings.effectsDescription", this.effectsEnabled, () => {
      this.effectsEnabled = !this.effectsEnabled;
    });
    this.addStepperRow(
      585,
      "settings.effectsVolume",
      "settings.effectsVolumeDescription",
      this.effectsVolume,
      (delta) => {
        this.effectsVolume = clampVolume(this.effectsVolume + delta);
      },
    );
    this.addNotice("settings.vibrationNotice", 705);
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
      225,
      "settings.subject",
      "settings.subjectDescription",
      subjectMessages[this.subjectIndex],
      () => {
        this.subjectIndex = (this.subjectIndex + 1) % subjectMessages.length;
      },
    );
    this.addSelectCard(
      950,
      225,
      "settings.difficulty",
      "settings.difficultyDescription",
      difficultyMessages[this.difficultyIndex],
      () => {
        this.difficultyIndex = (this.difficultyIndex + 1) % difficultyMessages.length;
      },
    );
    this.addGridToggle(370, 350, "settings.hints", "settings.hintsDescription", this.hintsEnabled, () => {
      this.hintsEnabled = !this.hintsEnabled;
    });
    this.addGridToggle(
      950,
      350,
      "settings.explanations",
      "settings.explanationsDescription",
      this.explanationsEnabled,
      () => {
        this.explanationsEnabled = !this.explanationsEnabled;
      },
    );
    this.addGoalCard();
    this.addActionCard(950, 475, "settings.tutorial", "settings.tutorialDescription", "settings.replay", () =>
      this.notify("settings.tutorialReady"),
    );
    this.addDangerCard(370, 615, "settings.learningReset", "settings.learningResetDescription", "settings.reset", () =>
      this.askConfirmation("learningReset"),
    );
  }

  private renderDisplay(): void {
    this.addToggleRow(225, "settings.reducedMotion", "settings.reducedMotionDescription", this.reducedMotion, () => {
      this.reducedMotion = !this.reducedMotion;
    });
    this.addSelectRow(
      345,
      "settings.textSize",
      "settings.textSizeDescription",
      textSizeMessages[this.textSizeIndex],
      () => {
        this.textSizeIndex = (this.textSizeIndex + 1) % textSizeMessages.length;
      },
    );
    this.addActionRow(465, "settings.fullscreen", "settings.fullscreenDescription", "settings.openFullscreen", () =>
      this.notify("settings.fullscreenReady"),
    );
    this.addToggleRow(585, "settings.gradeLabels", "settings.gradeLabelsDescription", this.gradeLabels, () => {
      this.gradeLabels = !this.gradeLabels;
    });
  }

  private renderSupport(): void {
    const actions: ReadonlyArray<[MessageId, MessageId, MessageId]> = [
      ["settings.faq", "settings.faqDescription", "settings.open"],
      ["settings.gameGuide", "settings.gameGuideDescription", "settings.open"],
      ["settings.contact", "settings.contactDescription", "settings.open"],
      ["settings.bugReport", "settings.bugReportDescription", "settings.open"],
      ["settings.copyDiagnostics", "settings.copyDiagnosticsDescription", "settings.copy"],
      ["settings.terms", "settings.termsDescription", "settings.open"],
      ["settings.privacy", "settings.privacyDescription", "settings.open"],
      ["settings.licenses", "settings.licensesDescription", "settings.open"],
    ];
    actions.forEach(([label, detail, action], index) => {
      const x = index % 2 === 0 ? 370 : 950;
      const y = 225 + Math.floor(index / 2) * 125;
      this.addActionCard(x, y, label, detail, action, () =>
        this.notify(action === "settings.copy" ? "settings.copied" : "settings.supportReady"),
      );
    });
    this.addNotice("settings.versionValue", 735);
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

  private addStepperRow(
    y: number,
    label: MessageId,
    detail: MessageId,
    value: number,
    change: (delta: number) => void,
  ): void {
    this.addCard(370, y, 1150, 100);
    this.addLabel(label, 400, y + 18, 20);
    this.addDetail(detail, 400, y + 54);
    this.addActionButton("settings.decrease", 1280, y + 26, 55, () => this.change(() => change(-10)));
    const amount = new Text({ text: message("settings.percent", { value }), style: textStyle(18, 0x493022, "800") });
    amount.anchor.set(0.5);
    amount.position.set(1385, y + 48);
    this.addActionButton("settings.increase", 1435, y + 26, 55, () => this.change(() => change(10)));
    this.addChild(amount);
  }

  private addSelectRow(y: number, label: MessageId, detail: MessageId, value: MessageId, select: () => void): void {
    this.addCard(370, y, 1150, 100);
    this.addLabel(label, 400, y + 18, 20);
    this.addDetail(detail, 400, y + 54);
    this.addActionButton(value, 1280, y + 23, 210, () => this.change(select));
  }

  private addActionRow(y: number, label: MessageId, detail: MessageId, action: MessageId, onPress: () => void): void {
    this.addCard(370, y, 1150, 100);
    this.addLabel(label, 400, y + 18, 20);
    this.addDetail(detail, 400, y + 54);
    this.addActionButton(action, 1280, y + 23, 210, onPress);
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

  private addGoalCard(): void {
    this.addCard(370, 475, 555, 115);
    this.addLabel("settings.dailyGoal", 400, 492, 20);
    this.addDetail("settings.dailyGoalDescription", 400, 528);
    this.addActionButton("settings.decrease", 700, 512, 50, () =>
      this.change(() => {
        this.dailyGoal = Math.max(1, this.dailyGoal - 1);
      }),
    );
    const goal = new Text({
      text: message("settings.problemCount", { count: this.dailyGoal }),
      style: textStyle(17, 0x493022, "800"),
    });
    goal.anchor.set(0.5);
    goal.position.set(802, 535);
    this.addActionButton("settings.increase", 845, 512, 50, () =>
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
    this.addChild(
      new Graphics().roundRect(x, y, width, height, 22).fill(0xfff8e9).stroke({ color: 0xc38a58, width: 2 }),
    );
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
    const blocker = new Graphics().rect(0, 0, 1600, 900).fill({ color: 0x2f1d16, alpha: 0.55 });
    blocker.eventMode = "static";
    const panel = new Graphics().roundRect(520, 285, 600, 310, 30).fill(0xfff4df).stroke({ color: 0x9d4b3d, width: 5 });
    const title = new Text({ text: message(confirmMessages[action].title), style: textStyle(27, 0x742e27, "800") });
    title.anchor.set(0.5);
    title.position.set(820, 350);
    const detail = new Text({
      text: message(confirmMessages[action].description),
      style: { ...textStyle(17, 0x654238, "600"), align: "center", lineHeight: 28 },
    });
    detail.anchor.set(0.5);
    detail.position.set(820, 425);
    const cancel = new CanvasButton({
      label: message("settings.cancel"),
      width: 190,
      height: 54,
      color: 0xd7b28c,
      onPress: () => {
        this.confirmAction = null;
        this.render();
      },
    });
    cancel.position.set(600, 505);
    const confirm = new CanvasButton({
      label: message("settings.confirm"),
      width: 190,
      height: 54,
      color: 0xd96c5b,
      onPress: () => {
        this.confirmAction = null;
        this.notify(confirmMessages[action].status);
        this.render();
      },
    });
    confirm.position.set(850, 505);
    this.addChild(blocker, panel, title, detail, cancel, confirm);
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
  display: { tab: "settings.tabDisplay", title: "settings.displayTitle", description: "settings.displayDescription" },
  support: { tab: "settings.tabSupport", title: "settings.supportTitle", description: "settings.supportDescription" },
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
const difficultyMessages: readonly MessageId[] = [
  "settings.difficultyIntro",
  "settings.difficultyBasic",
  "settings.difficultyPractice",
];
const textSizeMessages: readonly MessageId[] = ["settings.textSmall", "settings.textNormal", "settings.textLarge"];

function clampVolume(value: number): number {
  return Math.min(100, Math.max(0, value));
}
