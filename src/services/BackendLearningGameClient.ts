import type {
  ApplyRoomThemeResult,
  CatHomeResult,
  CatMemoryClearResult,
  CatSelectionResult,
  CodeChallengeView,
  CodeSubmissionResult,
  DailyQuestView,
  DailyRewardResult,
  GachaDrawResult,
  GameClient,
  GameStateListener,
  MoveFurnitureCommand,
  PlacementCommand,
  PlacementResult,
  PurchaseResult,
  QuizAnswerResult,
  QuizView,
  StudyTaskView,
} from "../core/GameClient";
import type { CatVariant } from "../domain/cats";
import type { DailyQuestId } from "../domain/dailyQuest";
import type { GachaDrawCount } from "../domain/gacha";
import type { GameSettings } from "../domain/room";
import type { ShopItemId } from "../domain/shop";
import type { BackendApiClient, BackendLearningTask } from "./BackendApiClient";

/** 로컬 게임 기능은 유지하면서 학습 문제와 채점만 FastAPI에 위임하는 단계적 GameClient 구현이다. */
export class BackendLearningGameClient implements GameClient {
  private readonly tasks = new Map<string, BackendLearningTask>();

  private constructor(
    private readonly local: GameClient,
    private readonly api: BackendApiClient,
    tasks: BackendLearningTask[],
  ) {
    for (const task of tasks) {
      this.tasks.set(task.publicId, task);
    }
  }

  /** 서버 연결과 추천 과제 초기화를 마친 원격 학습 클라이언트를 만든다. */
  static async create(local: GameClient, api: BackendApiClient): Promise<BackendLearningGameClient> {
    await api.connect();
    const tasks = await api.getLearningRecommendations(10);
    return new BackendLearningGameClient(local, api, tasks);
  }

  getSnapshot() {
    return this.local.getSnapshot();
  }

  subscribe(listener: GameStateListener): () => void {
    return this.local.subscribe(listener);
  }

  placeFurniture(command: PlacementCommand): PlacementResult {
    return this.local.placeFurniture(command);
  }

  moveFurniture(instanceId: string, command: MoveFurnitureCommand): PlacementResult {
    return this.local.moveFurniture(instanceId, command);
  }

  removeFurniture(instanceId: string): boolean {
    return this.local.removeFurniture(instanceId);
  }

  buyShopItem(itemId: ShopItemId): PurchaseResult {
    return this.local.buyShopItem(itemId);
  }

  applyRoomTheme(itemId: ShopItemId): ApplyRoomThemeResult {
    return this.local.applyRoomTheme(itemId);
  }

  drawGacha(count: GachaDrawCount): GachaDrawResult {
    return this.local.drawGacha(count);
  }

  selectCat(variant: CatVariant): CatSelectionResult {
    return this.local.selectCat(variant);
  }

  setCatHome(variant: CatVariant, visible: boolean): CatHomeResult {
    return this.local.setCatHome(variant, visible);
  }

  getQuiz(quizId: string): QuizView | null {
    const task = this.tasks.get(quizId);
    if (task?.type !== "MULTIPLE_CHOICE" || !task.options) {
      return null;
    }
    return {
      id: task.publicId,
      title: { text: cleanTaskTitle(task.title) },
      summary: { text: task.description },
      prompt: { text: task.description },
      choices: Object.entries(task.options).map(([id, text]) => ({ id, label: { text } })),
      rewardCoins: 0,
      completed: task.completed,
    };
  }

  async answerQuiz(quizId: string, choiceId: string): Promise<QuizAnswerResult> {
    const task = this.tasks.get(quizId);
    if (task?.type !== "MULTIPLE_CHOICE") {
      return { ok: false, reason: "quiz-not-found" };
    }
    if (!task.options || !(choiceId in task.options)) {
      return { ok: false, reason: "choice-not-found" };
    }
    try {
      const attempt = await this.api.grade({ taskPublicId: quizId, selectedOption: choiceId, usedHint: false });
      if (attempt.status !== "COMPLETED" || attempt.correct === null) {
        return { ok: false, reason: "grading-failed" };
      }
      if (attempt.correct) {
        task.completed = true;
      }
      return {
        ok: true,
        correct: attempt.correct,
        feedbackMessage: attempt.correct ? "study.correct" : "study.serverAnswerIncorrect",
        firstCompletion: false,
        coinsAwarded: 0,
        serverAuthoritative: true,
      };
    } catch (error) {
      console.warn("Backend quiz grading failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  getStudyTasks(): StudyTaskView[] {
    return [...this.tasks.values()].map(toStudyTaskView);
  }

  getCodeChallenge(challengeId: string): CodeChallengeView | null {
    const task = this.tasks.get(challengeId);
    if (task?.type !== "CODE") {
      return null;
    }
    return {
      ...toStudyTaskView(task),
      type: "code",
      prompt: { text: task.description },
      signature: "",
      starterBody: task.templateCode,
      examples: { messageId: "study.serverExamples" },
      hints: task.hintText ? [{ text: task.hintText }] : [],
      bonusCoins: 0,
    };
  }

  async submitCodeChallenge(challengeId: string, body: string, hintsUsed: number): Promise<CodeSubmissionResult> {
    const task = this.tasks.get(challengeId);
    if (task?.type !== "CODE") {
      return { ok: false, reason: "challenge-not-found" };
    }
    if (!body.trim()) {
      return { ok: false, reason: "empty-code" };
    }
    try {
      const attempt = await this.api.grade({
        taskPublicId: challengeId,
        submittedCode: body,
        usedHint: hintsUsed > 0,
      });
      if (attempt.status !== "COMPLETED" || attempt.correct === null) {
        return { ok: false, reason: "grading-failed" };
      }
      if (attempt.correct) {
        task.completed = true;
      }
      return {
        ok: true,
        passed: attempt.correct,
        tests: [],
        firstCompletion: false,
        coinsAwarded: 0,
        serverAuthoritative: true,
      };
    } catch (error) {
      console.warn("Backend code grading failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  getDailyQuests(): DailyQuestView[] {
    return this.local.getDailyQuests();
  }

  claimDailyQuest(questId: DailyQuestId): DailyRewardResult {
    return this.local.claimDailyQuest(questId);
  }

  claimDailyBonus(): DailyRewardResult {
    return this.local.claimDailyBonus();
  }

  resetLearningProgress(): void {
    this.local.resetLearningProgress();
  }

  clearCatMemories(): CatMemoryClearResult {
    return this.local.clearCatMemories();
  }

  updateSettings(patch: Partial<GameSettings>): GameSettings {
    return this.local.updateSettings(patch);
  }
}

function toStudyTaskView(task: BackendLearningTask): StudyTaskView {
  return {
    id: task.publicId,
    type: task.type === "CODE" ? "code" : "quiz",
    concept: mapConcept(task.conceptName),
    difficulty: mapDifficulty(task.difficulty),
    title: { text: cleanTaskTitle(task.title) },
    summary: { text: task.description },
    rewardCoins: 0,
    completed: task.completed,
  };
}

function mapConcept(value: string): StudyTaskView["concept"] {
  const name = value.split(":").at(-1)?.toLowerCase();
  if (name === "variables" || name === "conditionals" || name === "loops" || name === "functions") {
    return name;
  }
  return "other";
}

function mapDifficulty(value: BackendLearningTask["difficulty"]): StudyTaskView["difficulty"] {
  if (value === "BRONZE") {
    return "basic";
  }
  if (value === "SILVER") {
    return "applied";
  }
  return "challenge";
}

function cleanTaskTitle(value: string): string {
  return value.replace(/^\[[^\]]+\]\s*/, "");
}
