import { Container, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type {
  Awaitable,
  CodeChallengeView,
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
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";
import type { CodeEditorOverlay, CodeEditorOverlayFactory } from "../ports/CodeEditorOverlay";
import { formatStudyDetails, summarizeStudyText } from "../presentation/studyPresentation";

type FilterValue<T extends string> = "all" | T;
type FilterSelectId = "type" | "concept" | "difficulty";
type FeedbackTest = { label: string; passed: boolean };
type LearningDomain = "PYTHON" | "SQL";
type LearningDomainChange = { learningDomain: LearningDomain; tasks: StudyTaskView[] };

type StudyModalOptions = {
  tasks: StudyTaskView[];
  learningDomain: LearningDomain;
  getMastery: () => StudyMasteryView;
  getTier: () => StudyTierView;
  getQuiz: (quizId: string) => QuizView | null;
  getCodeChallenge: (challengeId: string) => CodeChallengeView | null;
  onAnswer: (quizId: string, choiceId: string) => Awaitable<QuizAnswerResult>;
  onSubmitCode: (challengeId: string, code: string, hintsUsed: number) => Awaitable<CodeSubmissionResult>;
  onChangeLearningDomain: (learningDomain: LearningDomain) => Awaitable<LearningDomainChange>;
  onClose: () => void;
  backIcon: string;
  coinIcon: string;
  codeEditorFactory: CodeEditorOverlayFactory;
};

const conceptMessages: Record<StudyConcept, MessageId> = {
  variables: "study.conceptVariables",
  conditionals: "study.conceptConditionals",
  loops: "study.conceptLoops",
  functions: "study.conceptFunctions",
  other: "study.conceptOther",
};

const masteryConceptMessages: Record<string, MessageId> = {
  basics: "study.masteryConceptBasics",
  conditionals: "study.masteryConceptConditionals",
  loops: "study.masteryConceptLoops",
  strings: "study.masteryConceptStrings",
  collections: "study.masteryConceptCollections",
  functions: "study.masteryConceptFunctions",
  exceptions: "study.masteryConceptExceptions",
  filtering: "study.masteryConceptFiltering",
  aggregation: "study.masteryConceptAggregation",
  joins: "study.masteryConceptJoins",
  subqueries: "study.masteryConceptSubqueries",
  advanced_queries: "study.masteryConceptAdvancedQueries",
  data_manipulation: "study.masteryConceptDataManipulation",
  schema: "study.masteryConceptSchema",
  transactions: "study.masteryConceptTransactions",
};

const difficultyMessages: Record<
  StudyDifficulty,
  "study.filterBasic" | "study.filterApplied" | "study.filterChallenge"
> = {
  basic: "study.filterBasic",
  applied: "study.filterApplied",
  challenge: "study.filterChallenge",
};

/** 학습 대시보드와 퀴즈·함수 작성형 풀이 화면을 한 Canvas 장면에서 전환한다. */
export class StudyModal extends Container {
  private readonly background = new Graphics();
  private readonly page = new Container();
  private readonly body = new Container();
  private readonly feedbackLayer = new Container();
  private readonly options: StudyModalOptions;
  private tasks: StudyTaskView[];
  private learningDomain: LearningDomain;
  private domainChangePending = false;
  private typeFilter: FilterValue<StudyTaskType> = "all";
  private conceptFilter: FilterValue<StudyConcept> = "all";
  private difficultyFilter: FilterValue<StudyDifficulty> = "all";
  private openFilterSelect: FilterSelectId | null = null;
  private taskPage = 0;
  private codeEditor: CodeEditorOverlay | null = null;
  private hintsUsed = 0;
  private submissionPending = false;

  constructor(options: StudyModalOptions) {
    super();
    this.options = options;
    this.tasks = options.tasks.map((task) => ({ ...task }));
    this.learningDomain = options.learningDomain;
    this.background.eventMode = "static";
    this.body.sortableChildren = true;
    this.addChild(this.background, this.page);
    this.page.addChild(this.body, this.feedbackLayer);
    this.renderDashboard();
  }

  layout(width: number, height: number): void {
    this.background.clear().rect(0, 0, width, height).fill(0xf2d7aa);
    layoutToFillViewport(this.page, width, height);
    this.layoutCodeEditor();
  }

  private renderDashboard(): void {
    this.clearBody();
    this.drawBaseHeader(message("study.dashboardTitle"), message("study.dashboardSubtitle"), this.options.onClose);
    this.buildLearningDomainSelector();
    this.buildMasteryPanel();
    this.buildRecommendation();
    this.buildFilters();
    this.buildTaskList();
  }

  private buildLearningDomainSelector(): void {
    const label = new Text({ text: message("settings.subject"), style: textStyle(15, 0x604333, "800") });
    label.anchor.set(1, 0.5);
    label.position.set(1260, 51);
    const domains: readonly LearningDomain[] = ["PYTHON", "SQL"];
    const buttons = domains.map((domain, index) => {
      const active = domain === this.learningDomain;
      const button = new CanvasButton({
        label: message(domain === "PYTHON" ? "settings.subjectPython" : "settings.subjectSql"),
        width: 120,
        height: 50,
        color: active ? 0xf0ad55 : 0xe9c9a4,
        onPress: () => void this.changeLearningDomain(domain),
      });
      button.position.set(1280 + index * 135, 26);
      return button;
    });
    this.body.addChild(label, ...buttons);
  }

  private async changeLearningDomain(domain: LearningDomain): Promise<void> {
    if (this.domainChangePending || domain === this.learningDomain) {
      return;
    }
    this.domainChangePending = true;
    try {
      const result = await this.options.onChangeLearningDomain(domain);
      this.learningDomain = result.learningDomain;
      this.tasks = result.tasks.map((task) => ({ ...task }));
      this.typeFilter = "all";
      this.conceptFilter = "all";
      this.difficultyFilter = "all";
      this.openFilterSelect = null;
      this.taskPage = 0;
      this.renderDashboard();
    } finally {
      this.domainChangePending = false;
    }
  }

  private drawBaseHeader(titleValue: string, subtitleValue: string, onBack: () => void): void {
    this.body.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT));
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 72, onPress: onBack });
    back.position.set(28, 24);
    const title = new Text({ text: summarizeStudyText(titleValue, 44), style: textStyle(34, 0x3f281c, "800") });
    title.position.set(124, 24);
    const subtitle = new Text({
      text: summarizeStudyText(subtitleValue, 78),
      style: textStyle(17, 0x74523d, "600"),
    });
    subtitle.position.set(126, 66);
    const ornament = createTitleOrnament(126, 93, 190);
    this.body.addChild(back, title, subtitle, ornament);
  }

  private buildMasteryPanel(): void {
    const panel = createCozyPanel(45, 120, 430, 245, { fill: 0xfff7e8, border: 0xb47950, radius: 22 });
    const title = new Text({ text: message("study.masteryTitle"), style: textStyle(21, 0x493022, "800") });
    title.position.set(78, 142);
    const tier = this.options.getTier();
    const tierText = new Text({
      text:
        tier.nextTier === null
          ? message("study.tierHighest", { tier: tier.currentTier })
          : message("study.tierProgress", {
              tier: tier.currentTier,
              completed: tier.completed,
              required: tier.required,
            }),
      style: textStyle(13, 0x744a31, "800"),
    });
    tierText.anchor.set(1, 0);
    tierText.position.set(450, 147);
    this.body.addChild(panel, title, tierText);
    const masteryEntries = this.options.getMastery();
    masteryEntries.forEach((entry, index) => {
      const column = Math.floor(index / 5);
      const row = index % 5;
      const x = 68 + column * 202;
      const y = 180 + row * 32;
      const mastery = entry.proficiencyLevel;
      const isUnassessed = entry.attempts === 0;
      const labelId = masteryConceptMessages[entry.conceptName];
      const label = new Text({
        text: labelId ? message(labelId) : entry.conceptName,
        style: textStyle(12, 0x4a3023, "700"),
      });
      label.position.set(x, y - 4);
      const trackX = x + 82;
      const track = new Graphics().roundRect(trackX, y, 73, 14, 7).fill(0xe4ccb0);
      const fillWidth = mastery === 0 ? 0 : Math.max(6, (73 * mastery) / 100);
      if (fillWidth > 0) {
        track.roundRect(trackX, y, fillWidth, 14, 7).fill(entry.conceptName === "loops" ? 0xe69b4d : 0x82a768);
      }
      const value = new Text({
        text: isUnassessed ? message("study.masteryUnassessed") : message("study.masteryValue", { value: mastery }),
        style: textStyle(isUnassessed ? 12 : 14, isUnassessed ? 0x9a806e : 0x604333, "800"),
      });
      value.anchor.set(1, 0);
      value.position.set(x + 194, y - 3);
      this.body.addChild(label, track, value);
    });
    const notice = new Text({
      text: message("study.masteryNotice"),
      style: textStyle(12, 0x85634d, "600"),
    });
    notice.position.set(78, 340);
    this.body.addChild(notice);
  }

  private buildRecommendation(): void {
    const recommended = this.tasks.find((task) => !task.completed) ?? this.tasks[0];
    if (!recommended) {
      return;
    }
    const panel = createCozyPanel(500, 120, 1055, 245, { fill: 0xfff0cf, border: 0xd58438, radius: 22 });
    const heading = new Text({ text: message("study.recommendedTitle"), style: textStyle(20, 0x5a3725, "800") });
    heading.position.set(540, 143);
    const badge = new Graphics().roundRect(775, 140, 150, 30, 11).fill(0xd9783c);
    const completedCount = this.tasks.filter((task) => task.completed).length;
    const badgeText = new Text({
      text: message("study.progressBadge", { completed: completedCount, total: this.tasks.length }),
      style: textStyle(12, 0xffffff, "800"),
    });
    badgeText.anchor.set(0.5);
    badgeText.position.set(850, 155);
    const title = new Text({
      text: summarizeStudyText(resolveGameText(recommended.title), 36),
      style: textStyle(25, 0x3f281c, "800"),
    });
    title.position.set(540, 192);
    const summary = new Text({
      text: summarizeStudyText(resolveGameText(recommended.summary), 72),
      style: { ...textStyle(16, 0x6e4e3a, "600"), wordWrap: true, wordWrapWidth: 690, lineHeight: 23 },
    });
    summary.position.set(540, 235);
    const metadata = new Text({
      text: `${message(conceptMessages[recommended.concept])}  ·  ${message(difficultyMessages[recommended.difficulty])}`,
      style: textStyle(15, 0x7b5336, "700"),
    });
    metadata.position.set(540, 290);
    const reward = recommended.rewardCoins > 0 ? this.createCoinReward(recommended.rewardCoins, 15) : null;
    reward?.position.set(540 + metadata.width + 18, 299);
    const start = new CanvasButton({
      label: message(recommended.completed ? "study.reviewTask" : "study.quickStart"),
      width: 210,
      height: 56,
      color: 0xe99b45,
      onPress: () => this.openTask(recommended),
    });
    start.position.set(1290, 270);
    this.body.addChild(panel, heading, badge, badgeText, title, summary, metadata);
    if (reward) {
      this.body.addChild(reward);
    }
    this.body.addChild(start);
  }

  private buildFilters(): void {
    const tier = this.options.getTier();
    const panel = createCozyPanel(45, 390, 1510, 112, { fill: 0xfff6e5, border: 0xb68a61, radius: 18 });
    const title = new Text({ text: message("study.filterTitle"), style: textStyle(20, 0x493022, "800") });
    title.position.set(72, 425);
    const resultCount = new Text({
      text: message("study.filteredCount", { count: this.filteredTasks().length }),
      style: textStyle(15, 0x76533c, "800"),
    });
    resultCount.anchor.set(1, 0.5);
    resultCount.position.set(1515, 457);
    this.body.addChild(panel, title, resultCount);
    this.addFilterSelect(
      "type",
      230,
      430,
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
      430,
      350,
      "study.filterConceptLabel",
      [
        ["all", "study.filterAll"],
        ["variables", "study.filterVariables"],
        ["conditionals", "study.filterConditionals"],
        ["loops", "study.filterLoops"],
        ["functions", "study.filterFunctions"],
        ["other", "study.conceptOther"],
      ],
      this.conceptFilter,
      (value) => {
        this.conceptFilter = value;
        this.taskPage = 0;
      },
    );
    this.addFilterSelect(
      "difficulty",
      1015,
      430,
      295,
      "study.filterDifficultyLabel",
      ([
        ["all", "study.filterAll"],
        ["basic", "study.filterBasic"],
        ["applied", "study.filterApplied"],
        ["challenge", "study.filterChallenge"],
      ] as const).filter(([value]) => value === "all" || tier.unlockedDifficulties.includes(value)),
      this.difficultyFilter,
      (value) => {
        this.difficultyFilter = value;
        this.taskPage = 0;
      },
    );
  }

  private addFilterSelect<T extends string>(
    id: FilterSelectId,
    x: number,
    y: number,
    width: number,
    labelId: MessageId,
    entries: ReadonlyArray<readonly [FilterValue<T>, MessageId]>,
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
    const selectedText = new Text({ text: message(selectedEntry[1]), style: textStyle(17, 0x493022, "700") });
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
          label: message(optionLabel),
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
    const pageSize = 2;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    this.taskPage = Math.min(this.taskPage, pageCount - 1);
    const pageTasks = filtered.slice(this.taskPage * pageSize, this.taskPage * pageSize + pageSize);
    pageTasks.forEach((task, index) => {
      const x = 55 + index * 765;
      const y = 530;
      const card = createCozyPanel(x, y, 730, 175, {
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
        text: `${message(conceptMessages[task.concept])} · ${message(difficultyMessages[task.difficulty])}`,
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
        onPress: () => this.openTask(task),
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
      empty.position.set(800, 620);
      this.body.addChild(empty);
    }
    const previous = new CanvasButton({
      label: message("study.previousPage"),
      width: 135,
      height: 46,
      color: this.taskPage > 0 ? 0xd9b184 : 0xd8d0c5,
      onPress: () => {
        if (this.taskPage === 0) {
          return;
        }
        this.taskPage -= 1;
        this.renderDashboard();
      },
    });
    previous.position.set(590, 750);
    const page = new Text({
      text: message("study.pageStatus", { current: this.taskPage + 1, total: pageCount }),
      style: textStyle(17, 0x55382a, "800"),
    });
    page.anchor.set(0.5);
    page.position.set(800, 773);
    const next = new CanvasButton({
      label: message("study.nextPage"),
      width: 135,
      height: 46,
      color: this.taskPage < pageCount - 1 ? 0xe5a153 : 0xd8d0c5,
      onPress: () => {
        if (this.taskPage >= pageCount - 1) {
          return;
        }
        this.taskPage += 1;
        this.renderDashboard();
      },
    });
    next.position.set(875, 750);
    this.body.addChild(previous, page, next);
  }

  private filteredTasks(): StudyTaskView[] {
    return this.tasks.filter(
      (task) =>
        (this.typeFilter === "all" || task.type === this.typeFilter) &&
        (this.conceptFilter === "all" || task.concept === this.conceptFilter) &&
        (this.difficultyFilter === "all" || task.difficulty === this.difficultyFilter),
    );
  }

  private openTask(task: StudyTaskView): void {
    if (task.type === "quiz") {
      const quiz = this.options.getQuiz(task.id);
      if (quiz) {
        this.renderQuiz(quiz);
      }
      return;
    }
    const challenge = this.options.getCodeChallenge(task.id);
    if (challenge) {
      this.renderCode(challenge);
    }
  }

  private renderQuiz(quiz: QuizView): void {
    this.clearBody();
    this.drawBaseHeader(resolveGameText(quiz.title), resolveGameText(quiz.summary), () => this.renderDashboard());
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
      .roundRect(95, 137, 1320, promptBoxHeight, 16)
      .fill(0xfff3d9)
      .stroke({ color: 0xd6ad7c, width: 2 });
    const choiceLayout = quizChoiceLayout(prompt.y + prompt.height, quiz.choices.length);
    const choicesTitle = new Text({ text: message("study.choicesTitle"), style: textStyle(20, 0x493022, "800") });
    choicesTitle.position.set(115, choiceLayout.titleY);
    this.body.addChild(problem, promptBox, prompt, choicesTitle);
    if (quiz.rewardCoins > 0) {
      const reward = this.createCoinRewardBadge(quiz.rewardCoins, 125);
      reward.position.set(1320, 145);
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
      this.showFeedback(false, message("study.answerFailed"), [], () => this.renderQuiz(quiz));
      return;
    } finally {
      this.submissionPending = false;
    }
    if (!result.ok) {
      this.showFeedback(false, message("study.answerFailed"), [], () => this.renderQuiz(quiz));
      return;
    }
    let detail = message(result.feedbackMessage);
    if (result.correct && result.serverAuthoritative) {
      detail = message("study.serverGradingComplete", { feedback: message(result.feedbackMessage) });
    } else if (result.correct && result.firstCompletion) {
      detail = message("study.rewardAwarded", {
        feedback: message(result.feedbackMessage),
        amount: result.coinsAwarded,
      });
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
    this.drawBaseHeader(resolveGameText(challenge.title), resolveGameText(challenge.summary), () =>
      this.renderDashboard(),
    );
    const problemPanel = createCozyPanel(55, 120, 500, 720, { fill: 0xfff8e9, border: 0xb77a4f, radius: 28 });
    const editorPanel = createCozyPanel(580, 120, 965, 720, { fill: 0xfff8e9, border: 0xb77a4f, radius: 28 });
    const problemTitle = new Text({ text: message("study.problemTitle"), style: textStyle(24, 0x493022, "800") });
    problemTitle.position.set(92, 155);
    const prompt = new Text({
      text: formatStudyDetails(resolveGameText(challenge.prompt)),
      style: {
        ...textStyle(16, 0x5f4434, "600"),
        breakWords: true,
        wordWrap: true,
        wordWrapWidth: 420,
        lineHeight: 23,
      },
    });
    prompt.position.set(92, 198);
    fitWrappedTextHeight(prompt, 155, 12, 16, 7);
    const examplesTitleY = 368;
    const examplesTitle = new Text({ text: message("study.examplesTitle"), style: textStyle(20, 0x493022, "800") });
    examplesTitle.position.set(92, examplesTitleY);
    const examplesBoxY = 402;
    const examplesBox = new Graphics().roundRect(92, examplesBoxY, 425, 92, 16).fill(0xefe2ce);
    const examples = new Text({
      text: resolveGameText(challenge.examples),
      style: {
        ...textStyle(16, 0x52382a, "700"),
        breakWords: true,
        lineHeight: 27,
        wordWrap: true,
        wordWrapWidth: 365,
      },
    });
    examples.position.set(118, examplesBoxY + 22);
    fitWrappedTextHeight(examples, 52, 11, 16, 7);
    const hintNoticeY = 512;
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
    hintNotice.position.set(92, hintNoticeY);
    fitWrappedTextHeight(hintNotice, 46, 12, 15, 8);
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
    const hintButtonY = 572;
    hintText.position.set(92, 642);
    fitWrappedTextHeight(hintText, 165, 11, 16, 9);
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
          hintText.text = this.formatRevealedHints(challenge, this.hintsUsed);
          fitWrappedTextHeight(hintText, 165, 11, 16, 9);
        },
      });
      hintButton.position.set(92 + index * 140, hintButtonY);
      return hintButton;
    });
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
        this.codeEditor?.setValue(challenge.starterCode);
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
      problemTitle,
      prompt,
      examplesTitle,
      examplesBox,
      examples,
      hintNotice,
      ...hintButtons,
      hintText,
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
    this.submissionPending = true;
    status.text = message("study.gradingInProgress");
    let result: CodeSubmissionResult;
    try {
      result = await this.options.onSubmitCode(challenge.id, code, this.hintsUsed);
    } catch (error) {
      console.error("Code submission failed", error);
      this.showFeedback(false, message("study.serverGradingUnavailable"), [], () =>
        this.renderCode(challenge, code, this.hintsUsed, true),
      );
      return;
    } finally {
      this.submissionPending = false;
      if (!status.destroyed) {
        status.text = message("study.editorIdle");
      }
    }
    if (!result.ok) {
      const feedback = result.reason === "empty-code" ? "study.emptyCode" : "study.serverGradingUnavailable";
      this.showFeedback(false, message(feedback), [], () => this.renderCode(challenge, code, this.hintsUsed, true));
      return;
    }
    let detail = message("study.gradingFailed");
    if (result.passed && result.serverAuthoritative) {
      detail = message("study.serverGradingPassed");
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
    }
    this.showFeedback(result.passed, detail, testRows, () => {
      if (result.passed) {
        this.renderDashboard();
        return;
      }
      this.renderCode(challenge, code, this.hintsUsed, true);
    });
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
    this.closeFeedback();
    this.codeEditor?.destroy();
    this.codeEditor = null;
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
