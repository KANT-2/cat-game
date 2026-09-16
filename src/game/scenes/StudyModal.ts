import { Container, Graphics, Sprite, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type {
  Awaitable,
  CodeChallengeView,
  CodeGradingVerdict,
  CodeSubmissionResult,
  GameText,
  QuizAnswerResult,
  QuizView,
  StudyMasteryView,
  StudyTaskView,
  StudyTierView,
} from "../../core/GameClient";
import type { StudyConcept, StudyDifficulty, StudyTaskType } from "../../domain/study";
import { BackButton } from "../components/BackButton";
import { CanvasButton, fitWrappedTextHeight } from "../components/CanvasButton";
import { createCozyPageBackground, createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { createCoinAmount } from "../components/CurrencyBar";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { StudySubjectButton } from "../components/StudyLandingUi";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import type { CodeEditorOverlay, CodeEditorOverlayFactory } from "../ports/CodeEditorOverlay";
import { formatStudyDetails, summarizeStudyText } from "../presentation/studyPresentation";

type FilterValue<T extends string> = "all" | T;
type FilterSelectId = "type" | "concept" | "difficulty";
type FilterLabel = MessageId | { text: string };
type StudySubject = StudyTaskView["language"];
const studySubjects: readonly StudySubject[] = ["python", "sql", "machine-learning"];
const subjectMessages: Record<StudySubject, MessageId> = {
  python: "study.languagePython",
  sql: "study.languageSql",
  "machine-learning": "study.subjectMachineLearning",
};
const subjectDescriptionMessages: Record<StudySubject, MessageId> = {
  python: "study.languagePythonDescription",
  sql: "study.languageSqlDescription",
  "machine-learning": "study.subjectMachineLearningDescription",
};
const subjectColors: Record<StudySubject, number> = {
  python: 0xe8a451,
  sql: 0xa9bf9b,
  "machine-learning": 0x9dbacf,
};
const subjectPageSize = 3;

type FeedbackTest = { label: string; passed: boolean };
type StudyModalOptions = {
  tasks: StudyTaskView[];
  getTasks: () => StudyTaskView[];
  getCoins: () => number;
  getMastery: () => StudyMasteryView;
  getTier: () => StudyTierView;
  onSelectSubject: (subject: StudySubject) => Awaitable<void>;
  mascot: string;
  onPrepareTask: (taskId: string) => Awaitable<StudyTaskView | null>;
  getQuiz: (quizId: string) => QuizView | null;
  getCodeChallenge: (challengeId: string) => CodeChallengeView | null;
  onAnswer: (quizId: string, choiceId: string) => Awaitable<QuizAnswerResult>;
  onSubmitCode: (challengeId: string, code: string, hintsUsed: number) => Awaitable<CodeSubmissionResult>;
  onClose: () => void;
  backIcon: string;
  coinIcon: string;
  codeEditorFactory: CodeEditorOverlayFactory;
};

const conceptMessages: Record<string, MessageId> = {
  basics: "study.masteryConceptBasics",
  variables: "study.conceptVariables",
  conditionals: "study.conceptConditionals",
  loops: "study.conceptLoops",
  strings: "study.masteryConceptStrings",
  collections: "study.masteryConceptCollections",
  functions: "study.conceptFunctions",
  exceptions: "study.masteryConceptExceptions",
  filtering: "study.masteryConceptFiltering",
  aggregation: "study.masteryConceptAggregation",
  joins: "study.masteryConceptJoins",
  subqueries: "study.masteryConceptSubqueries",
  advanced_queries: "study.masteryConceptAdvancedQueries",
  data_manipulation: "study.masteryConceptDataManipulation",
  schema: "study.masteryConceptSchema",
  transactions: "study.masteryConceptTransactions",
  "sql-select": "study.conceptSqlSelect",
  "sql-filter": "study.conceptSqlFilter",
  "sql-aggregate": "study.conceptSqlAggregate",
  "sql-join": "study.conceptSqlJoin",
  "ml-foundations": "study.conceptMlFoundations",
  "ml-validation": "study.conceptMlValidation",
  "ml-generalization": "study.conceptMlGeneralization",
  "ml-evaluation": "study.conceptMlEvaluation",
  other: "study.conceptOther",
};

const difficultyMessages: Record<
  StudyDifficulty,
  "study.filterBasic" | "study.filterApplied" | "study.filterChallenge"
> = {
  basic: "study.filterBasic",
  applied: "study.filterApplied",
  challenge: "study.filterChallenge",
};

/** 학습 대시보드와 퀴즈·코드 작성 풀이 화면을 한 Canvas 장면에서 전환한다. */
export class StudyModal extends Container {
  private readonly background = new Graphics();
  private readonly landingMascot: Sprite;
  private readonly page = new Container();
  private readonly body = new Container();
  private readonly feedbackLayer = new Container();
  private readonly options: StudyModalOptions;
  private tasks: StudyTaskView[];
  private selectedSubject: StudySubject | null = null;
  private typeFilter: FilterValue<StudyTaskType> = "all";
  private conceptFilter: FilterValue<StudyConcept> = "all";
  private difficultyFilter: FilterValue<StudyDifficulty> = "all";
  private openFilterSelect: FilterSelectId | null = null;
  private taskPage = 0;
  private subjectPage = 0;
  private masteryPage = 0;
  private viewportWidth = BASE_WIDTH;
  private viewportHeight = BASE_HEIGHT;
  private codeEditor: CodeEditorOverlay | null = null;
  private currentCoins: Container | null = null;
  private readonly codeDrafts = new Map<string, string>();
  private readonly codeHintDrafts = new Map<string, number>();
  private hintsUsed = 0;
  private submissionPending = false;
  private taskOpening = false;

  constructor(options: StudyModalOptions) {
    super();
    this.options = options;
    this.landingMascot = Sprite.from(options.mascot);
    applySmoothTextureSampling(this.landingMascot);
    this.landingMascot.anchor.set(0.5, 0.85);
    this.landingMascot.eventMode = "none";
    this.tasks = options.tasks.map((task) => ({ ...task }));
    this.background.eventMode = "static";
    this.body.sortableChildren = true;
    this.addChild(this.background, this.page);
    this.page.addChild(this.body, this.feedbackLayer, this.landingMascot);
    this.renderDashboard();
  }

  layout(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.background.clear().rect(0, 0, width, height).fill(0xfff7e8);
    layoutToFillViewport(this.page, width, height);
    this.layoutCodeEditor();
  }

  private renderDashboard(): void {
    this.clearBody();
    if (!this.selectedSubject) {
      this.body.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT));
      this.buildLandingHeader();
      this.buildMasteryPanel();
      this.buildRecommendation();
      this.buildSubjectSelection();
      this.buildCurrentCoins();
      this.layout(this.viewportWidth, this.viewportHeight);
      return;
    }
    this.drawBaseHeader(message(subjectMessages[this.selectedSubject]), null, () => {
      this.selectedSubject = null;
      this.openFilterSelect = null;
      this.renderDashboard();
    });
    this.buildTierStatus();
    this.buildCurrentCoins();
    this.buildFilters();
    this.buildTaskList();
    this.layout(this.viewportWidth, this.viewportHeight);
  }

  private buildLandingHeader(): void {
    this.landingMascot.visible = true;
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 72, onPress: this.options.onClose });
    back.position.set(24, 20);
    const title = new Text({ text: message("study.dashboardTitle"), style: textStyle(34, 0x3f2418, "800") });
    title.position.set(130, 22);
    const subtitle = new Text({ text: message("study.dashboardSubtitle"), style: textStyle(16, 0x76533d, "600") });
    subtitle.position.set(132, 66);
    const ornament = createTitleOrnament(132, 89, 170);
    this.landingMascot.scale.set(145 / this.landingMascot.texture.width);
    this.landingMascot.position.set(1400, 126);
    this.body.addChild(back, title, subtitle, ornament);
  }

  private buildSubjectSelection(): void {
    const panel = createCozyPanel(445, 455, 1110, 380, { fill: 0xfff8e9, border: 0x95603d, radius: 28 });
    const title = new Text({ text: message("study.languageTitle"), style: textStyle(32, 0x493022, "800") });
    title.position.set(490, 480);
    const help = new Text({ text: message("study.subjectSelectionHelp"), style: textStyle(21, 0x76533c, "600") });
    help.position.set(490, 522);
    this.body.addChild(panel, title, help);
    const availableSubjects = this.availableSubjects();
    const pageCount = Math.max(1, Math.ceil(availableSubjects.length / subjectPageSize));
    this.subjectPage = Math.min(this.subjectPage, pageCount - 1);
    const start = this.subjectPage * subjectPageSize;
    availableSubjects.slice(start, start + subjectPageSize).forEach((subject, index) => {
      const button = new StudySubjectButton({
        label: message(subjectMessages[subject]),
        description: message(subjectDescriptionMessages[subject]),
        color: subjectColors[subject],
        width: 320,
        height: 155,
        onPress: () => void this.selectSubject(subject),
      });
      button.position.set(480 + index * 350, 565);
      this.body.addChild(button);
    });
    this.buildPagination(
      this.subjectPage,
      pageCount,
      770,
      (page) => {
        this.subjectPage = page;
        this.renderDashboard();
      },
      true,
    );
  }

  private availableSubjects(): StudySubject[] {
    return studySubjects.filter((subject) => this.tasks.some((task) => task.language === subject));
  }

  private async selectSubject(subject: StudySubject): Promise<void> {
    this.selectedSubject = subject;
    this.typeFilter = "all";
    this.conceptFilter = "all";
    this.difficultyFilter = "all";
    this.taskPage = 0;
    this.openFilterSelect = null;
    this.renderDashboard();
    try {
      await this.options.onSelectSubject(subject);
      this.tasks = this.options.getTasks().map((task) => ({ ...task }));
    } catch (error) {
      console.warn("Study subject selection refresh failed", error);
    }
    this.renderDashboard();
  }

  private buildCurrentCoins(): void {
    this.currentCoins?.removeFromParent();
    this.currentCoins?.destroy({ children: true });
    const coins = createCoinAmount(this.options.coinIcon, this.options.getCoins().toLocaleString("ko-KR"), {
      fontSize: 21,
      iconSize: 32,
    });
    coins.position.set(1370, 48);
    this.currentCoins = coins;
    this.body.addChild(coins);
  }

  private buildTierStatus(): void {
    const tier = this.options.getTier();
    const status = new Text({ text: tierProgressText(tier), style: textStyle(16, 0x76533c, "700") });
    status.anchor.set(1, 0);
    status.position.set(1325, 28);
    this.body.addChild(status);
  }

  private drawBaseHeader(titleValue: string, subtitleValue: string | null, onBack: () => void): void {
    this.body.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT));
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 72, onPress: onBack });
    back.position.set(28, 24);
    const title = new Text({ text: summarizeStudyText(titleValue, 44), style: textStyle(34, 0x3f281c, "800") });
    title.position.set(124, 24);
    const ornamentY = subtitleValue ? 93 : 76;
    const ornament = createTitleOrnament(126, ornamentY, 190);
    this.body.addChild(back, title, ornament);
    if (subtitleValue) {
      const subtitle = new Text({
        text: summarizeStudyText(subtitleValue, 78),
        style: textStyle(17, 0x74523d, "600"),
      });
      subtitle.position.set(126, 66);
      this.body.addChild(subtitle);
    }
  }

  private buildMasteryPanel(): void {
    const panel = createCozyPanel(55, 125, 360, 710, { fill: 0xfff4df, border: 0xa66b43, radius: 28 });
    const tier = this.options.getTier();
    const mastery = this.options.getMastery();
    const title = new Text({
      text: message("study.conceptMasteryTitle", { subject: message(subjectMessages[domainSubject(tier.domain)]) }),
      style: textStyle(21, 0x493022, "800"),
    });
    title.anchor.set(0.5);
    title.position.set(235, 170);
    const headingRule = new Graphics().moveTo(90, 202).lineTo(380, 202).stroke({ color: 0xc3a382, width: 1.3 });
    const tierText = new Text({ text: tierProgressText(tier), style: textStyle(15, 0x76533c, "700") });
    tierText.anchor.set(0.5);
    tierText.position.set(235, 225);
    this.body.addChild(panel, title, headingRule, tierText);

    const pageSize = 4;
    const pageCount = Math.max(1, Math.ceil(mastery.length / pageSize));
    this.masteryPage = Math.min(this.masteryPage, pageCount - 1);
    const start = this.masteryPage * pageSize;
    mastery.slice(start, start + pageSize).forEach((entry, index) => {
      const y = 260 + index * 84;
      const label = new Text({ text: conceptText(entry.conceptName), style: textStyle(17, 0x4a3023, "700") });
      label.position.set(90, y);
      const valueText =
        entry.attempts === 0
          ? message("study.masteryUnassessed")
          : message("study.masteryValue", { value: entry.proficiencyLevel });
      const value = new Text({ text: valueText, style: textStyle(16, 0x604333, "800") });
      value.anchor.set(1, 0);
      value.position.set(380, y);
      const track = new Graphics()
        .roundRect(90, y + 28, 290, 16, 8)
        .fill({ color: 0xe5d5bd, alpha: 0.8 })
        .stroke({ color: 0xb79874, width: 1.5 });
      if (entry.proficiencyLevel > 0) {
        const fillWidth = Math.max(16, (290 * entry.proficiencyLevel) / 100);
        track
          .roundRect(90, y + 28, fillWidth, 16, 8)
          .fill(0x88aa5e)
          .stroke({ color: 0x57783b, width: 1.5 });
      }
      const tierConcept = tier.concepts.find((concept) => concept.conceptName === entry.conceptName);
      const detailText =
        tier.nextTier && tierConcept
          ? message("study.masteryPromotionProgress", {
              completed: entry.completed,
              total: entry.total,
              tierCompleted: tierConcept.completed,
              tierRequired: tierConcept.required,
            })
          : message("study.masteryProgress", { completed: entry.completed, total: entry.total });
      const detail = new Text({
        text: detailText,
        style: textStyle(13, 0x76533c, "600"),
      });
      detail.position.set(90, y + 50);
      this.body.addChild(label, value, track, detail);
    });
    const previous = new CanvasButton({
      label: message("study.previousPage"),
      width: 82,
      height: 34,
      fontSize: 13,
      color: this.masteryPage > 0 ? 0xd9b184 : 0xd8d0c5,
      disabled: this.masteryPage === 0,
      onPress: () => {
        this.masteryPage -= 1;
        this.renderDashboard();
      },
    });
    previous.position.set(90, 610);
    const page = new Text({
      text: message("study.pageStatus", { current: this.masteryPage + 1, total: pageCount }),
      style: textStyle(15, 0x55382a, "800"),
    });
    page.anchor.set(0.5);
    page.position.set(235, 627);
    const next = new CanvasButton({
      label: message("study.nextPage"),
      width: 82,
      height: 34,
      fontSize: 13,
      color: this.masteryPage < pageCount - 1 ? 0xe5a153 : 0xd8d0c5,
      disabled: this.masteryPage >= pageCount - 1,
      onPress: () => {
        this.masteryPage += 1;
        this.renderDashboard();
      },
    });
    next.position.set(298, 610);
    const noticePanel = new Graphics()
      .roundRect(90, 675, 290, 105, 20)
      .fill(0xffe8bf)
      .stroke({ color: 0xd39b5d, width: 2 });
    const notice = new Text({
      text: message("study.masteryNotice"),
      style: { ...textStyle(15, 0x76533c, "600"), align: "center", wordWrap: true, wordWrapWidth: 248, lineHeight: 22 },
    });
    notice.anchor.set(0.5);
    notice.position.set(235, 727);
    this.body.addChild(previous, page, next, noticePanel, notice);
  }

  private buildRecommendation(): void {
    const recommended = this.tasks.find((task) => !task.completed) ?? this.tasks[0];
    const panel = createCozyPanel(445, 125, 1110, 300, { fill: 0xfff8e9, border: 0x95603d, radius: 28 });
    const heading = new Text({ text: message("study.recommendedTitle"), style: textStyle(25, 0x493022, "800") });
    heading.position.set(490, 155);
    const completedCount = this.tasks.filter((task) => task.completed).length;
    const badge = new Graphics().roundRect(1360, 151, 150, 38, 19).fill(0xf2e7cf);
    if (completedCount > 0) {
      badge.roundRect(1360, 151, Math.max(38, (150 * completedCount) / this.tasks.length), 38, 19).fill(0xb6cd87);
    }
    badge.roundRect(1360, 151, 150, 38, 19).stroke({ color: 0x91a46c, width: 1.5 });
    const badgeText = new Text({
      text: message("study.progressBadge", { completed: completedCount, total: this.tasks.length }),
      style: textStyle(17, 0x57442b, "800"),
    });
    badgeText.anchor.set(0.5);
    badgeText.position.set(1435, 170);
    const rules = new Graphics()
      .moveTo(490, 198)
      .lineTo(1510, 198)
      .moveTo(490, 332)
      .lineTo(1510, 332)
      .stroke({ color: 0xc3a382, width: 1.3 });
    this.body.addChild(panel, heading, badge, badgeText, rules);
    if (!recommended) {
      const empty = new Text({ text: message("study.noTasks"), style: textStyle(21, 0x76533c, "600") });
      empty.position.set(490, 270);
      this.body.addChild(empty);
      return;
    }
    const title = new Text({
      text: summarizeStudyText(resolveGameText(recommended.title), 30),
      style: { ...textStyle(32, 0x3f281c, "800"), wordWrap: true, wordWrapWidth: 640, lineHeight: 38 },
    });
    title.position.set(490, 222);
    const summary = new Text({
      text: summarizeStudyText(resolveGameText(recommended.summary), 60),
      style: { ...textStyle(18, 0x6e4e3a, "600"), wordWrap: true, wordWrapWidth: 690, lineHeight: 25 },
    });
    summary.position.set(490, 275);
    const metadata = new Text({
      text: `${conceptText(recommended.concept)}  ·  ${message(difficultyMessages[recommended.difficulty])}`,
      style: textStyle(20, 0x7b5336, "700"),
    });
    metadata.position.set(490, 365);
    const reward =
      recommended.rewardCoins > 0
        ? createCoinAmount(this.options.coinIcon, `+${recommended.rewardCoins}`, { fontSize: 22, iconSize: 30 })
        : null;
    reward?.position.set(490 + metadata.width + 20, 380);
    const start = new CanvasButton({
      label: message(recommended.completed ? "study.reviewTask" : "study.quickStart"),
      width: 225,
      height: 62,
      fontSize: 25,
      color: 0xeeaa58,
      onPress: () => this.openTask(recommended),
    });
    start.position.set(1275, 346);
    this.body.addChild(title, summary, metadata);
    if (reward) {
      this.body.addChild(reward);
    }
    const arrow = new Graphics()
      .moveTo(1460, 363)
      .lineTo(1470, 377)
      .lineTo(1460, 391)
      .stroke({ color: 0x754322, width: 4, cap: "round", join: "round" });
    this.body.addChild(start, arrow);
  }

  private buildFilters(): void {
    const panel = createCozyPanel(45, 120, 1510, 112, { fill: 0xfff6e5, border: 0xb68a61, radius: 18 });
    const title = new Text({ text: message("study.filterTitle"), style: textStyle(20, 0x493022, "800") });
    title.position.set(72, 155);
    const resultCount = new Text({
      text: message("study.filteredCount", { count: this.filteredTasks().length }),
      style: textStyle(15, 0x76533c, "800"),
    });
    resultCount.anchor.set(1, 0.5);
    resultCount.position.set(1515, 187);
    this.body.addChild(panel, title, resultCount);
    this.addFilterSelect(
      "type",
      230,
      160,
      295,
      "study.filterTypeLabel",
      [
        ["all", "study.filterAll"],
        ["quiz", "study.filterQuiz"],
        ["code", "study.filterCode"],
      ],
      this.typeFilter,
      (value) => {
        this.typeFilter = value;
        this.taskPage = 0;
      },
    );
    this.addFilterSelect(
      "concept",
      595,
      160,
      350,
      "study.filterConceptLabel",
      this.conceptEntriesForSelectedSubject(),
      this.conceptFilter,
      (value) => {
        this.conceptFilter = value;
        this.taskPage = 0;
      },
    );
    this.addFilterSelect(
      "difficulty",
      1015,
      160,
      295,
      "study.filterDifficultyLabel",
      [
        ["all", "study.filterAll"],
        ["basic", "study.filterBasic"],
        ["applied", "study.filterApplied"],
        ["challenge", "study.filterChallenge"],
      ],
      this.difficultyFilter,
      (value) => {
        this.difficultyFilter = value;
        this.taskPage = 0;
      },
    );
  }

  private conceptEntriesForSelectedSubject(): ReadonlyArray<readonly [FilterValue<StudyConcept>, FilterLabel]> {
    const concepts = [
      ...new Set(this.tasks.filter((task) => task.language === this.selectedSubject).map((task) => task.concept)),
    ].sort((left, right) => left.localeCompare(right));
    return [["all", "study.filterAll"], ...concepts.map((concept) => [concept, conceptFilterLabel(concept)] as const)];
  }

  private addFilterSelect<T extends string>(
    id: FilterSelectId,
    x: number,
    y: number,
    width: number,
    labelId: MessageId,
    entries: ReadonlyArray<readonly [FilterValue<T>, FilterLabel]>,
    selected: FilterValue<T>,
    setSelected: (value: FilterValue<T>) => void,
  ): void {
    const field = new Container();
    field.position.set(x, y);
    field.zIndex = 20;
    const label = new Text({ text: message(labelId), style: textStyle(14, 0x6b4a36, "800") });
    label.position.set(0, -21);
    const box = new Graphics().roundRect(0, 0, width, 52, 14).fill(0xfffdf5).stroke({ color: 0x8b654a, width: 3 });
    box.eventMode = "static";
    box.cursor = "pointer";
    const selectedEntry = entries.find(([value]) => value === selected) ?? entries[0];
    const selectedText = new Text({ text: filterLabelText(selectedEntry[1]), style: textStyle(17, 0x493022, "700") });
    selectedText.position.set(18, 15);
    const arrow = new Graphics().poly([width - 35, 20, width - 17, 20, width - 26, 31]).fill(0x765039);
    box.on("pointertap", (event) => {
      event.stopPropagation();
      this.openFilterSelect = this.openFilterSelect === id ? null : id;
      this.renderDashboard();
    });
    field.addChild(label, box, selectedText, arrow);
    if (this.openFilterSelect === id) {
      const menuHeight = entries.length * 40 + 8;
      const menu = new Container();
      menu.position.set(0, 56);
      const menuBackground = new Graphics()
        .roundRect(0, 0, width, menuHeight, 15)
        .fill(0xfff8e9)
        .stroke({ color: 0x8b654a, width: 3 });
      menu.addChild(menuBackground);
      entries.forEach(([value, optionLabel], index) => {
        const option = new CanvasButton({
          label: filterLabelText(optionLabel),
          width: width - 12,
          height: 34,
          color: value === selected ? 0xb6ca91 : 0xffefd6,
          onPress: () => {
            setSelected(value);
            this.openFilterSelect = null;
            this.renderDashboard();
          },
        });
        option.position.set(6, 5 + index * 40);
        menu.addChild(option);
      });
      field.addChild(menu);
    }
    this.body.addChild(field);
  }

  private buildTaskList(): void {
    const filtered = this.filteredTasks();
    const pageSize = 6;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    this.taskPage = Math.min(this.taskPage, pageCount - 1);
    const pageTasks = filtered.slice(this.taskPage * pageSize, this.taskPage * pageSize + pageSize);
    pageTasks.forEach((task, index) => {
      const x = 55 + (index % 2) * 765;
      const y = 250 + Math.floor(index / 2) * 185;
      const card = createCozyPanel(x, y, 730, 165, {
        fill: task.completed ? 0xf0eadb : 0xfff9eb,
        border: task.completed ? 0x98aa82 : 0xc28a5b,
        radius: 22,
      });
      const typeBadge = new Graphics()
        .roundRect(x + 24, y + 22, 105, 31, 10)
        .fill(task.type === "quiz" ? 0x769cba : 0x9b7caf);
      const type = new Text({
        text: message(task.type === "quiz" ? "study.filterQuiz" : "study.filterCode"),
        style: textStyle(13, 0xffffff, "800"),
      });
      type.anchor.set(0.5);
      type.position.set(x + 76, y + 37);
      const title = new Text({
        text: summarizeStudyText(resolveGameText(task.title), 34),
        style: textStyle(21, 0x493022, "800"),
      });
      title.position.set(x + 150, y + 19);
      const summary = new Text({
        text: summarizeStudyText(resolveGameText(task.summary), 68),
        style: { ...textStyle(15, 0x76533c, "600"), wordWrap: true, wordWrapWidth: 650, lineHeight: 21 },
      });
      summary.position.set(x + 24, y + 67);
      const meta = new Text({
        text: `${conceptText(task.concept)} · ${message(difficultyMessages[task.difficulty])}`,
        style: textStyle(14, 0x876147, "700"),
      });
      meta.position.set(x + 24, y + 118);
      const reward = task.rewardCoins > 0 ? this.createCoinReward(task.rewardCoins, 14) : null;
      reward?.position.set(x + 24 + meta.width + 16, y + 127);
      const start = new CanvasButton({
        label: message(task.completed ? "study.reviewTask" : "study.taskStart"),
        width: 145,
        height: 44,
        color: task.completed ? 0xa9b699 : 0xe8a451,
        onPress: () => void this.openTask(task),
      });
      start.position.set(x + 560, y + 112);
      this.body.addChild(card, typeBadge, type, title, summary, meta);
      if (reward) {
        this.body.addChild(reward);
      }
      this.body.addChild(start);
    });
    if (filtered.length === 0) {
      const empty = new Text({ text: message("study.noTasks"), style: textStyle(19, 0x76533c, "700") });
      empty.anchor.set(0.5);
      empty.position.set(800, 350);
      this.body.addChild(empty);
    }
    this.buildPagination(this.taskPage, pageCount, 815, (page) => {
      this.taskPage = page;
      this.renderDashboard();
    });
  }

  private buildPagination(
    current: number,
    total: number,
    y: number,
    onChange: (page: number) => void,
    compact = false,
  ): void {
    const width = compact ? 100 : 135;
    const height = compact ? 32 : 46;
    const previous = new CanvasButton({
      label: message("study.previousPage"),
      width,
      height,
      color: current > 0 ? 0xd9b184 : 0xd8d0c5,
      disabled: current === 0,
      onPress: () => onChange(current - 1),
    });
    previous.position.set(compact ? 640 : 590, y);
    const page = new Text({
      text: message("study.pageStatus", { current: current + 1, total }),
      style: textStyle(17, 0x55382a, "800"),
    });
    page.anchor.set(0.5);
    page.position.set(800, y + height / 2);
    const next = new CanvasButton({
      label: message("study.nextPage"),
      width,
      height,
      color: current < total - 1 ? 0xe5a153 : 0xd8d0c5,
      disabled: current >= total - 1,
      onPress: () => onChange(current + 1),
    });
    next.position.set(compact ? 860 : 875, y);
    this.body.addChild(previous, page, next);
  }

  private filteredTasks(): StudyTaskView[] {
    return this.tasks.filter(
      (task) =>
        task.language === this.selectedSubject &&
        (this.typeFilter === "all" || task.type === this.typeFilter) &&
        (this.conceptFilter === "all" || task.concept === this.conceptFilter) &&
        (this.difficultyFilter === "all" || task.difficulty === this.difficultyFilter),
    );
  }

  private async openTask(task: StudyTaskView): Promise<void> {
    if (this.taskOpening) {
      return;
    }
    this.taskOpening = true;
    try {
      const prepared = await this.options.onPrepareTask(task.id);
      if (!prepared) {
        return;
      }
      const index = this.tasks.findIndex((candidate) => candidate.id === task.id);
      if (index >= 0) {
        this.tasks[index] = { ...prepared };
      }
      const quiz = this.options.getQuiz(task.id);
      if (quiz) {
        this.renderQuiz(quiz);
        return;
      }
      const challenge = this.options.getCodeChallenge(task.id);
      if (challenge) {
        const draft = this.codeDrafts.get(challenge.id);
        this.renderCode(
          challenge,
          draft ?? challenge.starterCode,
          this.codeHintDrafts.get(challenge.id) ?? 0,
          draft !== undefined,
        );
      }
    } catch (error) {
      console.warn("Study task preparation failed", error);
    } finally {
      this.taskOpening = false;
    }
  }

  /** 재발급된 presentation은 CODE/MULTIPLE_CHOICE 중 하나로 무작위 배정되므로,
   * 재시도 시 원래 화면과 다른 타입이 오면 실제로 발급된 타입을 그대로 열어준다.
   */
  private reopenQuizOrCode(taskId: string, fallback: QuizView): void {
    const quiz = this.options.getQuiz(taskId);
    if (quiz) {
      this.renderQuiz(quiz);
      return;
    }
    const challenge = this.options.getCodeChallenge(taskId);
    if (challenge) {
      this.renderCode(challenge);
      return;
    }
    this.renderQuiz(fallback);
  }

  private renderQuiz(quiz: QuizView): void {
    this.clearBody();
    this.drawBaseHeader(resolveGameText(quiz.title), resolveGameText(quiz.summary), () => this.renderDashboard());
    this.buildCurrentCoins();
    const problem = createCozyPanel(70, 115, 1460, 750, { fill: 0xfff9ec, border: 0xb77a4f, radius: 28 });
    const prompt = new Text({
      text: formatStudyDetails(resolveGameText(quiz.prompt)),
      style: {
        ...textStyle(19, 0x493022, "600"),
        lineHeight: 27,
        breakWords: true,
        wordWrap: true,
        wordWrapWidth: 1160,
      },
    });
    prompt.position.set(115, 155);
    fitQuizPromptText(prompt);
    const promptBoxHeight = prompt.height + 34;
    const promptBox = new Graphics()
      .roundRect(95, 137, 1250, promptBoxHeight, 16)
      .fill(0xfff3d9)
      .stroke({ color: 0xd6ad7c, width: 2 });
    const choiceLayout = quizChoiceLayout(prompt.y + prompt.height, quiz.choices.length);
    const choicesTitle = new Text({ text: message("study.choicesTitle"), style: textStyle(20, 0x493022, "800") });
    choicesTitle.position.set(115, choiceLayout.titleY);
    this.body.addChild(problem, promptBox, prompt, choicesTitle);
    if (quiz.rewardCoins > 0) {
      // Sits to the right of promptBox (which ends at x=1345), never overlapping its background.
      const reward = this.createCoinRewardBadge(quiz.rewardCoins, 125);
      reward.position.set(1360, 137);
      this.body.addChild(reward);
    }
    quiz.choices.forEach((choice, index) => {
      const button = new CanvasButton({
        label: `${String.fromCharCode(65 + index)}   ${resolveGameText(choice.label)}`,
        width: 1370,
        height: choiceLayout.height,
        fontSize: 16,
        wrapLabel: true,
        color: 0xffefd2,
        borderColor: 0xc18a5b,
        onPress: () => this.answerQuiz(quiz, choice.id),
      });
      button.position.set(115, choiceLayout.startY + index * (choiceLayout.height + choiceLayout.gap));
      this.body.addChild(button);
    });
  }

  private async answerQuiz(quiz: QuizView, choiceId: string): Promise<void> {
    if (this.submissionPending) {
      return;
    }
    this.submissionPending = true;
    let result: QuizAnswerResult;
    try {
      result = await this.options.onAnswer(quiz.id, choiceId);
    } catch (error) {
      console.error("Quiz submission failed", error);
      this.showFeedback(false, message("study.answerFailed"), [], () => this.reopenQuizOrCode(quiz.id, quiz));
      return;
    } finally {
      this.submissionPending = false;
    }
    if (!result.ok) {
      this.showFeedback(false, message("study.answerFailed"), [], () => this.reopenQuizOrCode(quiz.id, quiz));
      return;
    }
    let detail = message(result.feedbackMessage);
    if (result.correct && result.firstCompletion) {
      detail = message("study.rewardAwarded", {
        feedback: message(result.feedbackMessage),
        amount: result.coinsAwarded,
      });
    } else if (result.correct && result.serverAuthoritative) {
      detail = message("study.rewardAlreadyClaimed", { feedback: message(result.feedbackMessage) });
    } else if (result.correct) {
      detail = message("study.rewardAlreadyClaimed", { feedback: message(result.feedbackMessage) });
    }
    if (result.correct) {
      this.markTaskCompleted(quiz.id);
    }
    this.showFeedback(result.correct, detail, [], () => {
      if (result.correct) {
        this.renderDashboard();
        return;
      }
      this.renderQuiz(this.options.getQuiz(quiz.id) ?? quiz);
    });
  }

  private renderCode(
    challenge: CodeChallengeView,
    draftCode = challenge.starterCode,
    initialHintsUsed = 0,
    restored = false,
  ): void {
    this.clearBody();
    this.hintsUsed = initialHintsUsed;
    this.drawBaseHeader(resolveGameText(challenge.title), resolveGameText(challenge.summary), () => {
      this.persistCodeDraft(challenge.id);
      this.renderDashboard();
    });
    this.buildCurrentCoins();
    const problemPanel = createCozyPanel(55, 120, 500, 720, { fill: 0xfff8e9, border: 0xb77a4f, radius: 28 });
    const editorPanel = createCozyPanel(580, 120, 965, 720, { fill: 0xfff8e9, border: 0xb77a4f, radius: 28 });

    const problemPane = new Container();
    const referencePane = new Container();
    const hintPane = new Container();
    const prompt = new Text({
      text: formatStudyDetails(resolveGameText(challenge.prompt)),
      style: {
        ...textStyle(18, 0x5f4434, "600"),
        breakWords: true,
        wordWrap: true,
        wordWrapWidth: 420,
        lineHeight: 27,
      },
    });
    prompt.position.set(92, 235);
    fitWrappedTextHeight(prompt, 535, 13, 18, 9);
    problemPane.addChild(prompt);

    const referenceTitle = new Text({
      text: message(challenge.language === "sql" ? "study.sqlDatasetTitle" : "study.examplesTitle"),
      style: textStyle(20, 0x493022, "800"),
    });
    referenceTitle.position.set(92, 232);
    referencePane.addChild(referenceTitle);
    const examplesBox = new Graphics().roundRect(92, 270, 425, 480, 16).fill(0xefe2ce);
    const examples = new Text({
      text: resolveGameText(challenge.examples),
      style: {
        ...textStyle(16, 0x52382a, "700"),
        breakWords: true,
        lineHeight: 27,
        wordWrap: true,
        wordWrapWidth: 375,
      },
    });
    examples.position.set(116, 296);
    fitWrappedTextHeight(examples, 420, 12, 16, 8);
    if (challenge.language === "sql" && challenge.dataset.length > 0) {
      referencePane.addChild(this.buildSqlDatasetPreview(challenge.dataset));
    } else {
      referencePane.addChild(examplesBox, examples);
    }

    const hintNotice = new Text({
      text: message("study.hintRewardNotice"),
      style: {
        ...textStyle(15, 0x77523d, "600"),
        breakWords: true,
        wordWrap: true,
        wordWrapWidth: 420,
        lineHeight: 23,
      },
    });
    hintNotice.position.set(92, 235);
    fitWrappedTextHeight(hintNotice, 70, 12, 15, 8);
    const hintText = new Text({
      text: this.formatRevealedHints(challenge, initialHintsUsed),
      style: {
        ...textStyle(16, 0x4f663d, "700"),
        breakWords: true,
        wordWrap: true,
        wordWrapWidth: 420,
        lineHeight: 25,
      },
    });
    const hintButtonY = 325;
    hintText.position.set(92, 400);
    fitWrappedTextHeight(hintText, 350, 12, 16, 9);
    const revealedHints = new Set<number>(Array.from({ length: initialHintsUsed }, (_, index) => index));
    const hintButtons = challenge.hints.map((_, index) => {
      const hintButton = new CanvasButton({
        label: message("study.showHint", { step: index + 1, total: challenge.hints.length }),
        width: 125,
        height: 52,
        color: 0xa8bb84,
        onPress: () => {
          for (let hintIndex = 0; hintIndex <= index; hintIndex += 1) {
            revealedHints.add(hintIndex);
          }
          this.hintsUsed = revealedHints.size;
          this.codeHintDrafts.set(challenge.id, this.hintsUsed);
          hintText.text = this.formatRevealedHints(challenge, this.hintsUsed);
          fitWrappedTextHeight(hintText, 350, 12, 16, 9);
        },
      });
      hintButton.position.set(92 + index * 140, hintButtonY);
      return hintButton;
    });
    hintPane.addChild(hintNotice, ...hintButtons, hintText);

    const panes = [problemPane, referencePane, hintPane];
    const tabLabels = [
      message("study.problemTitle"),
      message(challenge.language === "sql" ? "study.sqlDataTab" : "study.examplesTitle"),
      message("study.hintsTab"),
    ];
    const tabButtons: CanvasButton[] = [];
    const activateTab = (selectedIndex: number) => {
      panes.forEach((pane, index) => {
        pane.visible = index === selectedIndex;
      });
      tabButtons.forEach((button, index) => {
        button.alpha = index === selectedIndex ? 1 : 0.72;
      });
    };
    tabLabels.forEach((label, index) => {
      const tab = new CanvasButton({
        label,
        width: 132,
        height: 48,
        fontSize: 15,
        color: index === 0 ? 0xe8a65e : 0xd9c5aa,
        onPress: () => activateTab(index),
      });
      tab.position.set(82 + index * 148, 158);
      tabButtons.push(tab);
    });
    activateTab(0);
    const editorTitle = new Text({
      text: message(challenge.language === "sql" ? "study.sqlEditorTitle" : "study.editorTitle"),
      style: textStyle(24, 0x493022, "800"),
    });
    editorTitle.position.set(625, 155);
    const editorHelp = new Text({
      text: message(editorHelpMessage(challenge.editorMode)),
      style: { ...textStyle(15, 0x76533c, "600"), wordWrap: true, wordWrapWidth: 470 },
    });
    editorHelp.position.set(625, 193);
    const editorStatus = new Text({
      text: message(restored ? "study.draftRestored" : "study.editorIdle"),
      style: textStyle(14, 0x76533c, "700"),
    });
    editorStatus.position.set(625, 708);
    this.codeEditor = this.options.codeEditorFactory.create({
      language: challenge.language,
      initialValue: draftCode,
      ariaLabel: message("study.codeEditorAriaLabel"),
      onFocusChange: (focused) => {
        if (!editorStatus.destroyed) {
          editorStatus.text = message(focused ? "study.editorFocused" : "study.editorIdle");
        }
      },
      onChange: (value) => {
        this.codeDrafts.set(challenge.id, value);
      },
      onLoadError: () => {
        if (!editorStatus.destroyed) {
          editorStatus.text = message("study.editorUnavailable");
        }
      },
    });
    this.layoutCodeEditor();
    const reset = new CanvasButton({
      label: message("study.resetCode"),
      width: 112,
      height: 42,
      fontSize: 14,
      color: 0xd9c5aa,
      onPress: () => {
        this.hintsUsed = 0;
        this.codeEditor?.setValue(challenge.starterCode);
        this.codeDrafts.delete(challenge.id);
        this.codeHintDrafts.delete(challenge.id);
        this.codeEditor?.focus();
        editorStatus.text = message("study.codeReset");
      },
    });
    reset.position.set(1115, 174);
    const paste = new CanvasButton({
      label: message("study.pasteCode"),
      width: 112,
      height: 42,
      fontSize: 14,
      color: 0xa8bb84,
      onPress: () => {
        void this.pasteIntoCodeEditor(editorStatus);
      },
    });
    paste.position.set(1240, 174);
    const submit = new CanvasButton({
      label: message("study.runTests"),
      width: 210,
      height: 62,
      color: 0xe99b45,
      onPress: () => this.submitCode(challenge, editorStatus),
    });
    submit.position.set(1275, 750);
    this.body.addChild(
      problemPanel,
      editorPanel,
      problemPane,
      referencePane,
      hintPane,
      ...tabButtons,
      editorTitle,
      editorHelp,
      reset,
      paste,
      editorStatus,
      submit,
    );
    if (challenge.rewardCoins > 0) {
      const reward = this.createCoinRewardBadge(challenge.rewardCoins, 130);
      reward.position.set(1370, 150);
      this.body.addChild(reward);
    }
  }

  private buildSqlDatasetPreview(dataset: CodeChallengeView["dataset"]): Container {
    const container = new Container();
    const visibleTables = dataset.slice(0, 3);
    visibleTables.forEach((table, tableIndex) => {
      const y = 270 + tableIndex * 158;
      const gridX = 100;
      const gridY = y + 39;
      const gridWidth = 409;
      const rowHeight = 29;
      const maximumColumns = 5;
      const hasHiddenColumns = table.columns.length > maximumColumns;
      const visibleColumns = hasHiddenColumns ? [...table.columns.slice(0, maximumColumns - 1), "…"] : table.columns;
      const columnWidth = gridWidth / Math.max(1, visibleColumns.length);
      const frame = new Graphics()
        .roundRect(92, y, 425, 142, 15)
        .fill(tableIndex % 2 === 0 ? 0xefe2ce : 0xf5ead8)
        .stroke({ color: 0xc9aa82, width: 1.5 });
      const name = new Text({ text: table.name, style: textStyle(17, 0x493022, "800") });
      name.position.set(108, y + 12);
      let rowSummaryValue = table.rowSummary ?? "";
      if (!rowSummaryValue && table.rows.length > 2) {
        rowSummaryValue = message("study.sqlDatasetShownRows", { total: table.rows.length, shown: 2 });
      }
      const rowSummary = new Text({ text: rowSummaryValue, style: textStyle(11, 0x876147, "700") });
      rowSummary.anchor.set(1, 0);
      rowSummary.position.set(500, y + 15);
      const grid = new Graphics()
        .roundRect(gridX, gridY, gridWidth, rowHeight * 3, 8)
        .fill(0xfffbf2)
        .rect(gridX, gridY, gridWidth, rowHeight)
        .fill(0xd8c09d)
        .rect(gridX, gridY + rowHeight * 2, gridWidth, rowHeight)
        .fill(0xf7edda)
        .roundRect(gridX, gridY, gridWidth, rowHeight * 3, 8)
        .stroke({ color: 0xa98561, width: 1.5 });
      const gridLines = new Graphics();
      for (let columnIndex = 1; columnIndex < visibleColumns.length; columnIndex += 1) {
        const x = gridX + columnWidth * columnIndex;
        gridLines.moveTo(x, gridY).lineTo(x, gridY + rowHeight * 3);
      }
      gridLines
        .moveTo(gridX, gridY + rowHeight)
        .lineTo(gridX + gridWidth, gridY + rowHeight)
        .moveTo(gridX, gridY + rowHeight * 2)
        .lineTo(gridX + gridWidth, gridY + rowHeight * 2)
        .stroke({ color: 0xb99a76, width: 1 });
      container.addChild(frame, name, rowSummary, grid, gridLines);
      visibleColumns.forEach((column, columnIndex) => {
        const heading = new Text({
          text: clipSqlTableCell(column, columnWidth),
          style: textStyle(12, 0x493022, "800"),
        });
        heading.anchor.set(0.5);
        heading.position.set(gridX + columnWidth * (columnIndex + 0.5), gridY + rowHeight / 2);
        container.addChild(heading);
      });
      const previewRows = table.rows.slice(0, 2);
      previewRows.forEach((row, rowIndex) => {
        const visibleValues = hasHiddenColumns ? [...row.slice(0, maximumColumns - 1), "…"] : row;
        visibleColumns.forEach((_, columnIndex) => {
          const value = visibleValues[columnIndex] ?? "";
          const cell = new Text({
            text: clipSqlTableCell(value, columnWidth),
            style: textStyle(11, 0x4f443d, "600"),
          });
          cell.anchor.set(0.5);
          cell.position.set(gridX + columnWidth * (columnIndex + 0.5), gridY + rowHeight * (rowIndex + 1.5));
          container.addChild(cell);
        });
      });
    });
    return container;
  }

  private persistCodeDraft(challengeId: string): void {
    if (!this.codeEditor) {
      return;
    }
    this.codeDrafts.set(challengeId, this.codeEditor.getValue());
    this.codeHintDrafts.set(challengeId, this.hintsUsed);
  }

  private async pasteIntoCodeEditor(status: Text): Promise<void> {
    try {
      const value = await navigator.clipboard.readText();
      if (!value) {
        status.text = message("study.clipboardEmpty");
        return;
      }
      this.codeEditor?.append(value);
      status.text = message("study.pasteComplete");
    } catch (error) {
      console.warn("Study editor clipboard read failed", error);
      status.text = message("study.clipboardUnavailable");
    }
  }

  private async submitCode(challenge: CodeChallengeView, status: Text): Promise<void> {
    if (this.submissionPending) {
      return;
    }
    const code = this.codeEditor?.getValue() ?? "";
    this.closeFeedback();
    this.codeDrafts.set(challenge.id, code);
    this.codeHintDrafts.set(challenge.id, this.hintsUsed);
    this.submissionPending = true;
    status.text = message("study.gradingInProgress");
    let result: CodeSubmissionResult;
    try {
      result = await this.options.onSubmitCode(challenge.id, code, this.hintsUsed);
    } catch (error) {
      console.error("Code submission failed", error);
      this.showCodeFeedback(false, message("study.serverGradingUnavailable"), []);
      return;
    } finally {
      this.submissionPending = false;
      if (!status.destroyed) {
        status.text = message("study.editorIdle");
      }
    }
    if (!result.ok) {
      const feedback = result.reason === "empty-code" ? "study.emptyCode" : "study.serverGradingUnavailable";
      this.showCodeFeedback(false, message(feedback), []);
      return;
    }
    let detail = gradingResultText(result.verdict, result.passedTests, result.totalTests, challenge.language);
    if (result.passed && result.firstCompletion) {
      detail = `${message(result.serverAuthoritative ? "study.serverGradingPassed" : "study.gradingPassed")}\n${message("study.gradingReward", { amount: result.coinsAwarded })}`;
    } else if (result.passed && result.serverAuthoritative) {
      detail = message("study.rewardAlreadyClaimed", { feedback: message("study.serverGradingPassed") });
    } else if (result.passed) {
      detail = `${message("study.gradingPassed")}\n${result.firstCompletion ? message("study.gradingReward", { amount: result.coinsAwarded }) : message("study.taskCompleted")}`;
    }
    const testRows = result.tests.map((test) => ({
      label: message("study.testCase", {
        input: test.input,
        expected: test.expected,
        actual: test.actual ?? message("study.noResult"),
      }),
      passed: test.passed,
    }));
    if (result.passed) {
      this.markTaskCompleted(challenge.id);
      this.buildCurrentCoins();
    }
    this.showCodeFeedback(result.passed, detail, testRows);
  }

  private formatRevealedHints(challenge: CodeChallengeView, count: number): string {
    return challenge.hints
      .slice(0, count)
      .map((hint, index) =>
        message("study.hintEntry", {
          step: index + 1,
          hint: resolveGameText(hint),
        }),
      )
      .join("\n");
  }

  private showFeedback(passed: boolean, detailValue: string, tests: FeedbackTest[], onContinue: () => void): void {
    this.closeFeedback();
    this.codeEditor?.setVisible(false);
    const blocker = new Graphics().rect(0, 0, BASE_WIDTH, BASE_HEIGHT).fill({ color: 0x2f211b, alpha: 0.58 });
    blocker.eventMode = "static";
    const modalTop = tests.length > 0 ? 105 : 155;
    const testRowY = 420;
    const closeY = tests.length > 0 ? testRowY + tests.length * 54 + 22 : 480;
    const panelBottom = closeY + 88;
    const panel = createCozyPanel(300, modalTop, 1000, panelBottom - modalTop, {
      fill: 0xfff8e8,
      border: passed ? 0x72945e : 0xb36554,
      radius: 30,
    });
    const title = new Text({ text: message("study.feedbackTitle"), style: textStyle(30, 0x3f281c, "800") });
    title.anchor.set(0.5);
    title.position.set(800, modalTop + 42);
    const subtitle = new Text({
      text: message(passed ? "study.feedbackSuccessSubtitle" : "study.feedbackRetrySubtitle"),
      style: textStyle(16, 0x74523d, "600"),
    });
    subtitle.anchor.set(0.5);
    subtitle.position.set(800, modalTop + 79);
    const statusBadge = new Graphics()
      .circle(800, modalTop + 140, 36)
      .fill(passed ? 0x87a66e : 0xd78b72)
      .stroke({ color: passed ? 0x5f814f : 0xa54f42, width: 4 });
    const status = new Text({ text: passed ? "✓" : "!", style: textStyle(38, 0xffffff, "800") });
    status.anchor.set(0.5);
    status.position.set(800, modalTop + 137);
    const detailPlate = new Graphics()
      .roundRect(350, modalTop + 195, 900, 105, 20)
      .fill(passed ? 0xe8f0dc : 0xf4dfd4)
      .stroke({ color: passed ? 0x87a66e : 0xd78b72, width: 2 });
    const detail = new Text({
      text: detailValue,
      style: { ...textStyle(21, 0x493022, "700"), align: "center", wordWrap: true, wordWrapWidth: 820, lineHeight: 31 },
    });
    detail.anchor.set(0.5, 0);
    detail.position.set(800, modalTop + 222);
    this.feedbackLayer.addChild(blocker, panel, title, subtitle, statusBadge, status, detailPlate, detail);
    tests.forEach((test, index) => {
      const row = new Graphics()
        .roundRect(350, testRowY + index * 54, 900, 44, 14)
        .fill(test.passed ? 0xe5efd9 : 0xf4dfd4);
      const label = new Text({
        text: `${test.passed ? "✓" : "×"}  ${test.label}`,
        style: textStyle(15, 0x584235, "700"),
      });
      label.anchor.set(0.5);
      label.position.set(800, testRowY + 22 + index * 54);
      this.feedbackLayer.addChild(row, label);
    });
    const close = new CanvasButton({
      label: message(passed ? "study.backToTasks" : "study.retry"),
      width: 220,
      height: 58,
      fontSize: 20,
      color: passed ? 0x87a66e : 0xe4a05a,
      onPress: () => {
        this.closeFeedback();
        onContinue();
      },
    });
    close.position.set(690, closeY);
    this.feedbackLayer.addChild(close);
  }

  private showCodeFeedback(passed: boolean, detailValue: string, tests: FeedbackTest[]): void {
    this.closeFeedback();
    const panel = createCozyPanel(55, 120, 500, 720, {
      fill: 0xfff8e8,
      border: passed ? 0x72945e : 0xb36554,
      radius: 28,
    });
    panel.eventMode = "static";
    const title = new Text({ text: message("study.feedbackTitle"), style: textStyle(27, 0x3f281c, "800") });
    title.anchor.set(0.5);
    title.position.set(305, 166);
    const subtitle = new Text({
      text: message(passed ? "study.feedbackSuccessSubtitle" : "study.feedbackRetrySubtitle"),
      style: {
        ...textStyle(14, 0x74523d, "600"),
        align: "center",
        wordWrap: true,
        wordWrapWidth: 390,
        lineHeight: 20,
      },
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(305, 193);
    const statusBadge = new Graphics()
      .circle(305, 267, 31)
      .fill(passed ? 0x87a66e : 0xd78b72)
      .stroke({ color: passed ? 0x5f814f : 0xa54f42, width: 3 });
    const statusMark = new Text({ text: passed ? "✓" : "!", style: textStyle(32, 0xffffff, "800") });
    statusMark.anchor.set(0.5);
    statusMark.position.set(305, 265);
    const detailPlate = new Graphics()
      .roundRect(82, 315, 446, 130, 17)
      .fill(passed ? 0xe8f0dc : 0xf4dfd4)
      .stroke({ color: passed ? 0x87a66e : 0xd78b72, width: 2 });
    const detail = new Text({
      text: detailValue,
      style: {
        ...textStyle(17, 0x493022, "700"),
        align: "center",
        wordWrap: true,
        wordWrapWidth: 400,
        lineHeight: 25,
      },
    });
    detail.anchor.set(0.5, 0);
    detail.position.set(305, 339);
    fitWrappedTextHeight(detail, 86, 12, 17, 7);
    this.feedbackLayer.addChild(panel, title, subtitle, statusBadge, statusMark, detailPlate, detail);
    tests.slice(0, 4).forEach((test, index) => {
      const y = 466 + index * 55;
      const row = new Graphics().roundRect(82, y, 446, 45, 13).fill(test.passed ? 0xe5efd9 : 0xf4dfd4);
      const label = new Text({
        text: `${test.passed ? "✓" : "×"}  ${test.label}`,
        style: { ...textStyle(13, 0x584235, "700"), wordWrap: true, wordWrapWidth: 400, align: "center" },
      });
      label.anchor.set(0.5);
      label.position.set(305, y + 22);
      fitWrappedTextHeight(label, 38, 10, 13, 5);
      this.feedbackLayer.addChild(row, label);
    });
    const close = new CanvasButton({
      label: message("study.feedbackClose"),
      width: 220,
      height: 58,
      fontSize: 19,
      color: passed ? 0x87a66e : 0xe4a05a,
      onPress: () => {
        this.closeFeedback();
        this.codeEditor?.focus();
      },
    });
    close.position.set(195, 754);
    this.feedbackLayer.addChild(close);
  }

  private closeFeedback(): void {
    this.feedbackLayer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
  }

  private markTaskCompleted(taskId: string): void {
    this.tasks = this.tasks.map((task) => (task.id === taskId ? { ...task, completed: true } : task));
  }

  private createCoinReward(amount: number, fontSize: number): Container {
    return createCoinAmount(this.options.coinIcon, `+${amount}`, {
      fontSize,
      iconSize: fontSize + 7,
      gap: 6,
      order: "amount-first",
    });
  }

  private createCoinRewardBadge(amount: number, width: number): Container {
    const height = 54;
    const badge = new Container();
    const frame = new Graphics()
      .roundRect(0, 0, width, height, 16)
      .fill(0xfff0cc)
      .stroke({ color: 0xd39a55, width: 2 });
    const reward = this.createCoinReward(amount, 17);
    reward.position.set((width - reward.width) / 2, height / 2);
    badge.addChild(frame, reward);
    return badge;
  }

  private clearBody(): void {
    this.landingMascot.visible = false;
    this.body.scale.set(1);
    this.body.position.set(0, 0);
    this.closeFeedback();
    this.codeEditor?.destroy();
    this.codeEditor = null;
    this.currentCoins = null;
    this.body.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    this.codeEditor?.destroy();
    this.codeEditor = null;
    super.destroy(options);
  }

  private layoutCodeEditor(): void {
    if (!this.codeEditor) {
      return;
    }
    const scale = this.page.scale.x;
    this.codeEditor.setBounds({
      left: this.page.x + 625 * scale,
      top: this.page.y + 235 * scale,
      width: 860 * scale,
      height: 455 * scale,
      scale,
    });
  }
}

function domainSubject(domain: StudyTierView["domain"]): StudySubject {
  return domain === "SQL" ? "sql" : "python";
}

function tierProgressText(tier: StudyTierView): string {
  if (!tier.nextTier) {
    return message("study.tierHighest", { tier: tier.currentTier });
  }
  return message("study.tierProgressDetail", {
    tier: tier.currentTier,
    completed: tier.completed,
    required: tier.required,
    percent: tier.conceptRequiredPercent,
  });
}

function conceptText(conceptName: string): string {
  const messageId = conceptMessages[conceptName];
  return messageId ? message(messageId) : conceptName.replaceAll("_", " ");
}

function conceptFilterLabel(conceptName: string): FilterLabel {
  return conceptMessages[conceptName] ?? { text: conceptText(conceptName) };
}

function filterLabelText(label: FilterLabel): string {
  return typeof label === "string" ? message(label) : label.text;
}

export function clipSqlTableCell(value: string, cellWidth: number): string {
  const maximumCharacters = Math.max(2, Math.floor((cellWidth - 12) / 7));
  return value.length > maximumCharacters ? `${value.slice(0, maximumCharacters - 1)}…` : value;
}

function gradingResultText(
  verdict: CodeGradingVerdict | undefined,
  passed: number | undefined,
  total: number | undefined,
  language: CodeChallengeView["language"],
): string {
  const messageByVerdict: Record<CodeGradingVerdict, MessageId> = {
    ACCEPTED: "study.gradingPassed",
    WRONG_ANSWER: language === "sql" ? "study.sqlWrongAnswer" : "study.pythonWrongAnswer",
    SYNTAX_ERROR: language === "sql" ? "study.sqlSyntaxError" : "study.pythonSyntaxError",
    RUNTIME_ERROR: language === "sql" ? "study.sqlRuntimeError" : "study.pythonRuntimeError",
    TIMEOUT: "study.gradingTimeout",
    OUTPUT_LIMIT: "study.gradingOutputLimit",
    MEMORY_LIMIT: "study.gradingMemoryLimit",
    SYSTEM_ERROR: "study.serverGradingUnavailable",
  };
  const detail = message(verdict ? messageByVerdict[verdict] : "study.gradingFailed");
  if (!total || passed === undefined) {
    return detail;
  }
  return `${detail}\n${message("study.gradingProgress", { passed, total })}`;
}

/** Shrink a wrapped quiz prompt only as much as needed to reserve space for all four choices. */
export function fitQuizPromptText(text: Text): void {
  const maximumHeight = 245;
  const minimumFontSize = 14;
  let fontSize = Number(text.style.fontSize);
  while (text.height > maximumHeight && fontSize > minimumFontSize) {
    fontSize -= 1;
    text.style.fontSize = fontSize;
    text.style.lineHeight = fontSize + 7;
  }
  if (text.height > maximumHeight) {
    text.scale.set(maximumHeight / text.height);
  }
}

/** Place quiz choices after the measured prompt and keep them inside the logical Canvas page. */
export function quizChoiceLayout(promptBottom: number, choiceCountValue: number) {
  const count = Math.max(1, choiceCountValue);
  const gap = 10;
  const titleY = promptBottom + 34;
  const startY = titleY + 38;
  const availableHeight = 825 - startY;
  const height = Math.min(72, Math.floor((availableHeight - gap * (count - 1)) / count));
  return { titleY, startY, height, gap, bottom: startY + count * height + (count - 1) * gap };
}

function resolveGameText(value: GameText): string {
  return "text" in value ? value.text : message(value.messageId);
}

function editorHelpMessage(mode: CodeChallengeView["editorMode"]): MessageId {
  if (mode === "function") {
    return "study.functionEditorHelp";
  }
  return mode === "query" ? "study.sqlEditorHelp" : "study.editorHelp";
}
