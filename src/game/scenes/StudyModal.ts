import { Container, Graphics, Sprite, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type {
  Awaitable,
  CodeChallengeView,
  CodeSubmissionResult,
  GameText,
  QuizAnswerResult,
  QuizView,
  StudyTaskView,
} from "../../core/GameClient";
import type { StudyConcept, StudyDifficulty, StudyTaskType } from "../../domain/study";
import { BackButton } from "../components/BackButton";
import { CanvasButton } from "../components/CanvasButton";
import { createCozyPageBackground, createCozyPanel, createTitleOrnament } from "../components/CozyGameUi";
import { layoutToFillViewport } from "../components/fullscreenLayout";
import { applySmoothTextureSampling } from "../components/smoothSprite";
import { BASE_HEIGHT, BASE_WIDTH, textStyle } from "../config";

type FilterValue<T extends string> = "all" | T;
type FilterSelectId = "type" | "concept" | "difficulty";

type StudyModalOptions = {
  tasks: StudyTaskView[];
  getQuiz: (quizId: string) => QuizView | null;
  getCodeChallenge: (challengeId: string) => CodeChallengeView | null;
  onAnswer: (quizId: string, choiceId: string) => Awaitable<QuizAnswerResult>;
  onSubmitCode: (challengeId: string, body: string, hintsUsed: number) => Awaitable<CodeSubmissionResult>;
  onClose: () => void;
  backIcon: string;
  coinIcon: string;
};

const conceptMessages: Record<StudyConcept, MessageId> = {
  variables: "study.conceptVariables",
  conditionals: "study.conceptConditionals",
  loops: "study.conceptLoops",
  functions: "study.conceptFunctions",
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

/** 학습 대시보드와 퀴즈·함수 작성형 풀이 화면을 한 Canvas 장면에서 전환한다. */
export class StudyModal extends Container {
  private readonly background = new Graphics();
  private readonly page = new Container();
  private readonly body = new Container();
  private readonly options: StudyModalOptions;
  private tasks: StudyTaskView[];
  private typeFilter: FilterValue<StudyTaskType> = "all";
  private conceptFilter: FilterValue<StudyConcept> = "all";
  private difficultyFilter: FilterValue<StudyDifficulty> = "all";
  private openFilterSelect: FilterSelectId | null = null;
  private taskPage = 0;
  private codeEditor: CanvasCodeEditor | null = null;
  private hintsUsed = 0;
  private submissionPending = false;

  constructor(options: StudyModalOptions) {
    super();
    this.options = options;
    this.tasks = options.tasks.map((task) => ({ ...task }));
    this.background.eventMode = "static";
    this.body.sortableChildren = true;
    this.addChild(this.background, this.page);
    this.page.addChild(this.body);
    this.renderDashboard();
  }

  layout(width: number, height: number): void {
    this.background.clear().rect(0, 0, width, height).fill(0xf2d7aa);
    layoutToFillViewport(this.page, width, height);
  }

  private renderDashboard(): void {
    this.clearBody();
    this.drawBaseHeader(message("study.dashboardTitle"), message("study.dashboardSubtitle"), this.options.onClose);
    this.buildMasteryPanel();
    this.buildRecommendation();
    this.buildFilters();
    this.buildTaskList();
  }

  private drawBaseHeader(titleValue: string, subtitleValue: string, onBack: () => void): void {
    this.body.addChild(createCozyPageBackground(BASE_WIDTH, BASE_HEIGHT, 790));
    const back = new BackButton({ iconSrc: this.options.backIcon, size: 72, onPress: onBack });
    back.position.set(28, 24);
    const title = new Text({ text: titleValue, style: textStyle(34, 0x3f281c, "800") });
    title.position.set(124, 24);
    const subtitle = new Text({ text: subtitleValue, style: textStyle(17, 0x74523d, "600") });
    subtitle.position.set(126, 66);
    const ornament = createTitleOrnament(126, 93, 190);
    this.body.addChild(back, title, subtitle, ornament);
  }

  private buildMasteryPanel(): void {
    const panel = createCozyPanel(45, 120, 430, 245, { fill: 0xfff7e8, border: 0xb47950, radius: 22 });
    const title = new Text({ text: message("study.masteryTitle"), style: textStyle(21, 0x493022, "800") });
    title.position.set(78, 142);
    this.body.addChild(panel, title);
    (["variables", "conditionals", "loops", "functions"] as const).forEach((concept, index) => {
      const related = this.tasks.filter((task) => task.concept === concept);
      const completed = related.filter((task) => task.completed).length;
      const mastery = related.length === 0 ? 0 : Math.round((completed / related.length) * 100);
      const y = 185 + index * 38;
      const label = new Text({ text: message(conceptMessages[concept]), style: textStyle(15, 0x4a3023, "700") });
      label.position.set(78, y - 4);
      const track = new Graphics().roundRect(205, y, 188, 14, 7).fill(0xe4ccb0);
      const fillWidth = mastery === 0 ? 0 : Math.max(10, (188 * mastery) / 100);
      if (fillWidth > 0) {
        track.roundRect(205, y, fillWidth, 14, 7).fill(concept === "loops" ? 0xe69b4d : 0x82a768);
      }
      const value = new Text({
        text: message("study.masteryValue", { value: mastery }),
        style: textStyle(14, 0x604333, "800"),
      });
      value.anchor.set(1, 0);
      value.position.set(438, y - 3);
      this.body.addChild(label, track, value);
    });
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
    const badgeText = new Text({ text: message("study.recommendedBadge"), style: textStyle(12, 0xffffff, "800") });
    badgeText.anchor.set(0.5);
    badgeText.position.set(850, 155);
    const title = new Text({ text: resolveGameText(recommended.title), style: textStyle(27, 0x3f281c, "800") });
    title.position.set(540, 192);
    const summary = new Text({
      text: resolveGameText(recommended.summary),
      style: { ...textStyle(16, 0x6e4e3a, "600"), wordWrap: true, wordWrapWidth: 940, lineHeight: 23 },
    });
    summary.position.set(540, 235);
    const metadata = new Text({
      text: `${message(conceptMessages[recommended.concept])}  ·  ${message(difficultyMessages[recommended.difficulty])}`,
      style: textStyle(15, 0x7b5336, "700"),
    });
    metadata.position.set(540, 290);
    const reward = recommended.rewardCoins > 0 ? this.createCoinReward(recommended.rewardCoins, 15) : null;
    reward?.position.set(540 + metadata.width + 18, 287);
    const start = new CanvasButton({
      label: message("study.quickStart"),
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
    const panel = createCozyPanel(45, 390, 1510, 112, { fill: 0xfff6e5, border: 0xb68a61, radius: 18 });
    const title = new Text({ text: message("study.filterTitle"), style: textStyle(20, 0x493022, "800") });
    title.position.set(72, 425);
    this.body.addChild(panel, title);
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
    const filtered = this.tasks.filter(
      (task) =>
        (this.typeFilter === "all" || task.type === this.typeFilter) &&
        (this.conceptFilter === "all" || task.concept === this.conceptFilter) &&
        (this.difficultyFilter === "all" || task.difficulty === this.difficultyFilter),
    );
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
      const title = new Text({ text: resolveGameText(task.title), style: textStyle(22, 0x493022, "800") });
      title.position.set(x + 150, y + 19);
      const summary = new Text({
        text: resolveGameText(task.summary),
        style: { ...textStyle(15, 0x76533c, "600"), wordWrap: true, wordWrapWidth: 675, lineHeight: 21 },
      });
      summary.position.set(x + 24, y + 67);
      const meta = new Text({
        text: `${message(conceptMessages[task.concept])} · ${message(difficultyMessages[task.difficulty])}`,
        style: textStyle(14, 0x876147, "700"),
      });
      meta.position.set(x + 24, y + 118);
      const reward = task.rewardCoins > 0 ? this.createCoinReward(task.rewardCoins, 14) : null;
      reward?.position.set(x + 24 + meta.width + 16, y + 115);
      const start = new CanvasButton({
        label: message(task.completed ? "study.taskCompleted" : "study.taskStart"),
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
    const problem = createCozyPanel(70, 125, 1460, 700, { fill: 0xfff9ec, border: 0xb77a4f, radius: 28 });
    const promptValue = resolveGameText(quiz.prompt);
    const [firstLine, ...codeLines] = promptValue.split("\n");
    const prompt = new Text({ text: firstLine, style: textStyle(23, 0x493022, "800") });
    prompt.position.set(115, 175);
    const codeBox = new Graphics()
      .roundRect(115, 235, 1370, 175, 16)
      .fill(0x252b35)
      .stroke({ color: 0x5c6674, width: 2 });
    const code = new Text({
      text: codeLines.join("\n").trim(),
      style: { ...textStyle(21, 0xdce99a, "600"), fontFamily: "Consolas, monospace", lineHeight: 31 },
    });
    code.position.set(145, 260);
    const choicesTitle = new Text({ text: message("study.choicesTitle"), style: textStyle(20, 0x493022, "800") });
    choicesTitle.position.set(115, 445);
    this.body.addChild(problem, prompt, codeBox, code, choicesTitle);
    if (quiz.rewardCoins > 0) {
      const reward = new Graphics()
        .roundRect(1320, 165, 125, 54, 16)
        .fill(0xfff0cc)
        .stroke({ color: 0xd39a55, width: 2 });
      const rewardIndicator = this.createCoinReward(quiz.rewardCoins, 17);
      rewardIndicator.position.set(1320 + (125 - rewardIndicator.width) / 2, 180);
      this.body.addChild(reward, rewardIndicator);
    }
    quiz.choices.forEach((choice, index) => {
      const button = new CanvasButton({
        label: `${String.fromCharCode(65 + index)}   ${resolveGameText(choice.label)}`,
        width: 1370,
        height: 68,
        color: 0xffefd2,
        borderColor: 0xc18a5b,
        onPress: () => this.answerQuiz(quiz, choice.id),
      });
      button.position.set(115, 490 + index * 88);
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

  private renderCode(challenge: CodeChallengeView): void {
    this.clearBody();
    this.hintsUsed = 0;
    this.drawBaseHeader(resolveGameText(challenge.title), resolveGameText(challenge.summary), () =>
      this.renderDashboard(),
    );
    const problemPanel = createCozyPanel(55, 120, 500, 720, { fill: 0xfff8e9, border: 0xb77a4f, radius: 28 });
    const editorPanel = createCozyPanel(580, 120, 965, 720, { fill: 0xfff8e9, border: 0xb77a4f, radius: 28 });
    const problemTitle = new Text({ text: message("study.problemTitle"), style: textStyle(24, 0x493022, "800") });
    problemTitle.position.set(92, 155);
    const prompt = new Text({
      text: resolveGameText(challenge.prompt),
      style: { ...textStyle(18, 0x5f4434, "600"), wordWrap: true, wordWrapWidth: 420, lineHeight: 29 },
    });
    prompt.position.set(92, 205);
    const examplesTitle = new Text({ text: message("study.examplesTitle"), style: textStyle(20, 0x493022, "800") });
    examplesTitle.position.set(92, 315);
    const examplesBox = new Graphics().roundRect(92, 355, 425, 120, 16).fill(0xefe2ce);
    const examples = new Text({
      text: resolveGameText(challenge.examples),
      style: { ...textStyle(17, 0x52382a, "700"), lineHeight: 36 },
    });
    examples.position.set(118, 377);
    const hintNotice = new Text({
      text: message("study.hintRewardNotice"),
      style: { ...textStyle(15, 0x77523d, "600"), wordWrap: true, wordWrapWidth: 420, lineHeight: 23 },
    });
    hintNotice.position.set(92, 510);
    const hintText = new Text({
      text: "",
      style: { ...textStyle(16, 0x4f663d, "700"), wordWrap: true, wordWrapWidth: 420, lineHeight: 25 },
    });
    hintText.position.set(92, 650);
    const revealedHints = new Set<number>();
    const hintButtons = challenge.hints.map((hintTextValue, index) => {
      const hintButton = new CanvasButton({
        label: message("study.showHint", { step: index + 1, total: challenge.hints.length }),
        width: 125,
        height: 52,
        color: 0xa8bb84,
        onPress: () => {
          revealedHints.add(index);
          this.hintsUsed = revealedHints.size;
          hintText.text = `${message("study.showHint", {
            step: index + 1,
            total: challenge.hints.length,
          })}\n${resolveGameText(hintTextValue)}`;
        },
      });
      hintButton.position.set(92 + index * 140, 575);
      return hintButton;
    });
    const editorTitle = new Text({ text: message("study.editorTitle"), style: textStyle(24, 0x493022, "800") });
    editorTitle.position.set(625, 155);
    const editorHelp = new Text({ text: message("study.editorHelp"), style: textStyle(15, 0x76533c, "600") });
    editorHelp.position.set(625, 193);
    this.codeEditor = new CanvasCodeEditor(challenge.signature, challenge.starterBody);
    this.codeEditor.position.set(625, 235);
    const submit = new CanvasButton({
      label: message("study.runTests"),
      width: 210,
      height: 62,
      color: 0xe99b45,
      onPress: () => this.submitCode(challenge),
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
      this.codeEditor,
      submit,
    );
    if (challenge.rewardCoins > 0) {
      const reward = new Graphics()
        .roundRect(1370, 150, 130, 54, 16)
        .fill(0xfff0cc)
        .stroke({ color: 0xd39a55, width: 2 });
      const rewardIndicator = this.createCoinReward(challenge.rewardCoins, 17);
      rewardIndicator.position.set(1370 + (130 - rewardIndicator.width) / 2, 165);
      this.body.addChild(reward, rewardIndicator);
    }
  }

  private async submitCode(challenge: CodeChallengeView): Promise<void> {
    if (this.submissionPending) {
      return;
    }
    const body = this.codeEditor?.value ?? "";
    this.submissionPending = true;
    let result: CodeSubmissionResult;
    try {
      result = await this.options.onSubmitCode(challenge.id, body, this.hintsUsed);
    } catch (error) {
      console.error("Code submission failed", error);
      this.showFeedback(false, message("study.serverGradingUnavailable"), [], () => this.renderCode(challenge));
      return;
    } finally {
      this.submissionPending = false;
    }
    if (!result.ok) {
      const feedback = result.reason === "empty-code" ? "study.emptyCode" : "study.serverGradingUnavailable";
      this.showFeedback(false, message(feedback), [], () => this.renderCode(challenge));
      return;
    }
    let detail = message("study.gradingFailed");
    if (result.passed && result.serverAuthoritative) {
      detail = message("study.serverGradingPassed");
    } else if (result.passed) {
      detail = `${message("study.gradingPassed")}\n${result.firstCompletion ? message("study.gradingReward", { amount: result.coinsAwarded }) : message("study.taskCompleted")}`;
    }
    const testRows = result.tests.map((test) =>
      message("study.testCase", {
        input: test.input,
        expected: test.expected,
        actual: test.actual ?? message("study.noResult"),
      }),
    );
    if (result.passed) {
      this.markTaskCompleted(challenge.id);
    }
    this.showFeedback(result.passed, detail, testRows, () => {
      if (result.passed) {
        this.renderDashboard();
        return;
      }
      this.renderCode(challenge);
    });
  }

  private showFeedback(passed: boolean, detailValue: string, tests: string[], onContinue: () => void): void {
    this.clearBody();
    this.drawBaseHeader(
      message("study.feedbackTitle"),
      message(passed ? "study.feedbackSuccessSubtitle" : "study.feedbackRetrySubtitle"),
      onContinue,
    );
    const panel = createCozyPanel(250, 125, 1100, 700, {
      fill: 0xfff8e8,
      border: passed ? 0x72945e : 0xb36554,
      radius: 30,
    });
    const statusBadge = new Graphics()
      .circle(800, 235, 48)
      .fill(passed ? 0x87a66e : 0xd78b72)
      .stroke({ color: passed ? 0x5f814f : 0xa54f42, width: 4 });
    const status = new Text({ text: passed ? "✓" : "!", style: textStyle(48, 0xffffff, "800") });
    status.anchor.set(0.5);
    status.position.set(800, 232);
    const detailPlate = new Graphics()
      .roundRect(380, 315, 840, 115, 20)
      .fill(passed ? 0xe8f0dc : 0xf4dfd4)
      .stroke({ color: passed ? 0x87a66e : 0xd78b72, width: 2 });
    const detail = new Text({
      text: detailValue,
      style: { ...textStyle(23, 0x493022, "700"), align: "center", wordWrap: true, wordWrapWidth: 760, lineHeight: 34 },
    });
    detail.anchor.set(0.5, 0);
    detail.position.set(800, 345);
    this.body.addChild(panel, statusBadge, status, detailPlate, detail);
    tests.forEach((test, index) => {
      const row = new Graphics().roundRect(380, 465 + index * 62, 840, 50, 14).fill(passed ? 0xe5efd9 : 0xf4dfd4);
      const label = new Text({ text: `${passed ? "✓" : "×"}  ${test}`, style: textStyle(15, 0x584235, "700") });
      label.anchor.set(0.5);
      label.position.set(800, 490 + index * 62);
      this.body.addChild(row, label);
    });
    const close = new CanvasButton({
      label: message(passed ? "study.backToTasks" : "study.retry"),
      width: 250,
      height: 64,
      fontSize: 20,
      color: passed ? 0x87a66e : 0xe4a05a,
      onPress: onContinue,
    });
    close.position.set(675, 720);
    this.body.addChild(close);
  }

  private markTaskCompleted(taskId: string): void {
    this.tasks = this.tasks.map((task) => (task.id === taskId ? { ...task, completed: true } : task));
  }

  private createCoinReward(amount: number, fontSize: number): Container {
    const reward = new Container();
    const amountLabel = new Text({ text: `+${amount}`, style: textStyle(fontSize, 0x654126, "800") });
    amountLabel.position.set(0, 1);
    const coin = Sprite.from(this.options.coinIcon);
    applySmoothTextureSampling(coin);
    const iconSize = fontSize + 7;
    coin.width = iconSize;
    coin.height = iconSize;
    coin.position.set(amountLabel.width + 6, 0);
    reward.addChild(amountLabel, coin);
    return reward;
  }

  private clearBody(): void {
    this.codeEditor?.destroy();
    this.codeEditor = null;
    this.body.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
  }
}

function resolveGameText(value: GameText): string {
  return "text" in value ? value.text : message(value.messageId);
}

class CanvasCodeEditor extends Container {
  private readonly codeText: Text;
  private readonly focusRing: Graphics;
  private focused = false;
  private bodyValue: string;
  private selectAll = false;
  private readonly keyHandler = (event: KeyboardEvent): void => this.handleKey(event);

  constructor(signature: string, starterBody: string) {
    super();
    this.bodyValue = starterBody;
    const background = new Graphics()
      .roundRect(0, 0, 860, 455, 18)
      .fill(0x202630)
      .stroke({ color: 0x586473, width: 3 });
    background.eventMode = "static";
    background.cursor = "text";
    background.on("pointertap", () => this.setFocused(true));
    this.focusRing = new Graphics();
    const signatureText = new Text({
      text: signature,
      style: { ...textStyle(20, 0x83c9e8, "700"), fontFamily: "Consolas, monospace" },
    });
    signatureText.position.set(28, 25);
    this.codeText = new Text({
      text: "",
      style: { ...textStyle(18, 0xe7eccf, "500"), fontFamily: "Consolas, monospace", lineHeight: 28 },
    });
    this.codeText.position.set(28, 68);
    this.addChild(background, this.focusRing, signatureText, this.codeText);
    this.refresh();
    window.addEventListener("keydown", this.keyHandler);
  }

  get value(): string {
    return this.bodyValue;
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    window.removeEventListener("keydown", this.keyHandler);
    super.destroy(options);
  }

  private setFocused(focused: boolean): void {
    this.focused = focused;
    this.refresh();
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.focused) {
      return;
    }
    if (event.key === "Escape") {
      this.setFocused(false);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      this.selectAll = true;
      event.preventDefault();
      this.refresh();
      return;
    }
    if (this.selectAll && event.key !== "Shift" && event.key !== "Control" && event.key !== "Meta") {
      this.bodyValue = "";
      this.selectAll = false;
    }
    if (event.key === "Backspace") {
      this.bodyValue = this.bodyValue.slice(0, -1);
    } else if (event.key === "Enter") {
      const currentLine = this.bodyValue.split("\n").at(-1) ?? "";
      const indentation = currentLine.match(/^\s*/)?.[0] ?? "";
      this.bodyValue += `\n${indentation}${currentLine.trimEnd().endsWith(":") ? "    " : ""}`;
    } else if (event.key === "Tab") {
      this.bodyValue += "    ";
    } else if (event.key.length === 1 && this.bodyValue.length < 900) {
      this.bodyValue += event.key;
    } else {
      return;
    }
    event.preventDefault();
    this.refresh();
  }

  private refresh(): void {
    this.codeText.text = `${this.bodyValue}${this.focused ? "▌" : ""}`;
    this.focusRing.clear();
    if (this.focused) {
      this.focusRing.roundRect(3, 3, 854, 449, 16).stroke({ color: 0xe7a854, width: 4 });
    }
  }
}
