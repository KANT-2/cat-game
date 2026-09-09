import type {
  ApplyRoomThemeResult,
  AttendanceClaimResult,
  AttendanceView,
  CatConversationResult,
  CatFreeConversationResult,
  CatHomeResult,
  CatMemoryClearResult,
  CatSelectionResult,
  CodeChallengeView,
  CodeSubmissionResult,
  DailyQuestView,
  DailyRewardResult,
  GachaDrawResult,
  GachaReward,
  GameClient,
  GameStateListener,
  LearningResetResult,
  MoveFurnitureCommand,
  PlacementCommand,
  PlacementResult,
  PurchaseResult,
  QuizAnswerResult,
  QuizView,
  StudyMasteryView,
  StudyTaskView,
  UseConsumableResult,
} from "../core/GameClient";
import {
  ATTENDANCE_DAILY_COINS,
  attendanceRewardForCycleDay,
  attendanceStreakBonus,
  nextAttendanceStreak,
} from "../domain/attendance";
import {
  type CatConversationTopic,
  catConversationMemorySummary,
  classifyLocalCatChat,
} from "../domain/catConversation";
import type { CatVariant } from "../domain/cats";
import { catVariants } from "../domain/cats";
import { type DailyQuestId, dailyQuestDefinitions } from "../domain/dailyQuest";
import type { GachaDrawCount } from "../domain/gacha";
import { gachaRewardDefinitions } from "../domain/gacha";
import type { FurnitureKind, GameSettings, GameState } from "../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../domain/shop";
import {
  type BackendApiClient,
  BackendApiError,
  type BackendConceptProficiency,
  type BackendGameSnapshot,
  type BackendLearningTask,
} from "./BackendApiClient";
import { learningDescription } from "./learningDescription";

/** FastAPI 상태와 명령을 권위 있게 사용하며 로컬 클라이언트는 초기 상태 형태에만 사용한다. */
export class BackendLearningGameClient implements GameClient {
  private readonly tasks = new Map<string, BackendLearningTask>();
  private readonly listeners = new Set<GameStateListener>();
  private state: GameState;
  private dailyHasCodeCompletion: boolean;
  private stateVersion: number;
  private snapshotGeneration = 0;
  private readonly catAssetPublicIds = new Map<CatVariant, string>();
  private mastery: StudyMasteryView;

  private constructor(
    local: GameClient,
    private readonly api: BackendApiClient,
    tasks: BackendLearningTask[],
    snapshot: BackendGameSnapshot,
    proficiencies: BackendConceptProficiency[],
  ) {
    for (const task of tasks) {
      this.tasks.set(task.publicId, task);
    }
    this.state = mergeTaskProgress(mergeServerSnapshot(local.getSnapshot(), snapshot), this.tasks.values());
    this.dailyHasCodeCompletion = snapshot.dailyHasCodeCompletion;
    this.stateVersion = snapshot.stateVersion;
    this.syncCatAssetPublicIds(snapshot);
    this.mastery = toStudyMastery(proficiencies);
  }

  /** 서버 연결과 추천 과제 초기화를 마친 원격 학습 클라이언트를 만든다. */
  static async create(local: GameClient, api: BackendApiClient): Promise<BackendLearningGameClient> {
    await api.connect();
    return BackendLearningGameClient.createConnected(local, api);
  }

  /** 인증이 끝난 HTTP 어댑터에서 서버 스냅샷과 추천 과제를 병렬로 읽어 원격 클라이언트를 만든다. */
  static async createConnected(local: GameClient, api: BackendApiClient): Promise<BackendLearningGameClient> {
    const [tasks, snapshot, proficiencies] = await Promise.all([
      api.getLearningRecommendations(10),
      api.getGameSnapshot(),
      api.getLearningProficiencies(),
    ]);
    return new BackendLearningGameClient(local, api, tasks, snapshot, proficiencies);
  }

  getSnapshot(): GameState {
    return cloneState(this.state);
  }

  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 네트워크 복구 뒤 추천 과제와 게임 스냅샷을 다시 읽어 현재 구독자에게 전달한다.
   *
   * @returns 새 스냅샷을 적용했으면 `true`, 동시에 끝난 명령의 최신 결과를 보호해 건너뛰었으면 `false`.
   * @remarks 재동기화보다 늦게 시작한 명령이 먼저 끝난 경우 오래된 읽기 결과로 덮어쓰지 않는다.
   */
  async refreshFromServer(): Promise<boolean> {
    const generation = this.snapshotGeneration;
    const [tasks, snapshot, proficiencies] = await Promise.all([
      this.api.getLearningRecommendations(10),
      this.api.getGameSnapshot(),
      this.api.getLearningProficiencies(),
    ]);
    if (generation !== this.snapshotGeneration || snapshot.stateVersion < this.stateVersion) {
      return false;
    }
    this.tasks.clear();
    for (const task of tasks) {
      this.tasks.set(task.publicId, task);
    }
    this.mastery = toStudyMastery(proficiencies);
    this.applyServerSnapshot(snapshot);
    return true;
  }

  async placeFurniture(command: PlacementCommand): Promise<PlacementResult> {
    const itemId = command.shopItemId ?? canonicalItemIds[command.kind];
    const placementId = createRequestId();
    try {
      const mutation = await this.api.placeGameFurniture(placementId, itemId, command.x, command.y, command.rotation);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, instanceId: placementId };
    } catch (error) {
      return { ok: false, reason: placementFailure(error) };
    }
  }

  async moveFurniture(instanceId: string, command: MoveFurnitureCommand): Promise<PlacementResult> {
    try {
      const mutation = await this.api.moveGameFurniture(instanceId, command.x, command.y, command.rotation);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, instanceId };
    } catch (error) {
      return { ok: false, reason: placementFailure(error) };
    }
  }

  async removeFurniture(instanceId: string): Promise<boolean> {
    try {
      const mutation = await this.api.removeGameFurniture(instanceId);
      this.applyServerSnapshot(mutation.snapshot);
      return true;
    } catch (error) {
      console.warn("Backend furniture removal failed", error);
      return false;
    }
  }

  async buyShopItem(itemId: ShopItemId): Promise<PurchaseResult> {
    const item = shopItemDefinitions[itemId];
    try {
      const mutation = await this.api.buyGameItem(createRequestId(), itemId);
      this.applyServerSnapshot(mutation.snapshot);
      if (item.kind === "furniture") {
        return {
          ok: true,
          itemId,
          itemType: "furniture",
          furnitureKind: item.furnitureKind,
          remainingCoins: mutation.snapshot.balance,
        };
      }
      return { ok: true, itemId, itemType: item.kind, remainingCoins: mutation.snapshot.balance };
    } catch (error) {
      if (isBackendReason(error, "already-owned")) {
        return { ok: false, reason: "already-owned" };
      }
      return {
        ok: false,
        reason: isBackendReason(error, "insufficient-coins") ? "insufficient-coins" : "server-unavailable",
      };
    }
  }

  async useConsumable(itemId: ShopItemId, catVariant: CatVariant): Promise<UseConsumableResult> {
    const item = shopItemDefinitions[itemId];
    if (item.kind !== "consumable") {
      return { ok: false, reason: "not-consumable" };
    }
    try {
      const mutation = await this.api.useGameConsumable(createRequestId(), itemId, catVariant);
      this.applyServerSnapshot(mutation.snapshot);
      const remainingQuantity =
        mutation.snapshot.items.find((entry) => entry.catalogKey === itemId)?.availableQuantity ?? 0;
      return { ok: true, itemId, effect: item.effect, remainingQuantity };
    } catch (error) {
      if (isBackendReason(error, "not-owned") || isBackendReason(error, "resource-not-found")) {
        return { ok: false, reason: "not-owned" };
      }
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async applyRoomTheme(itemId: ShopItemId | null): Promise<ApplyRoomThemeResult> {
    if (itemId === null) {
      try {
        const mutation = await this.api.applyGameTheme(null);
        this.applyServerSnapshot(mutation.snapshot);
        return { ok: true, itemId: null, itemType: "wallpaper" };
      } catch {
        return { ok: false, reason: "server-unavailable" };
      }
    }
    const item = shopItemDefinitions[itemId];
    if (item.kind !== "wallpaper" && item.kind !== "floor") {
      return { ok: false, reason: "not-theme" };
    }
    try {
      const mutation = await this.api.applyGameTheme(itemId);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, itemId, itemType: item.kind };
    } catch (error) {
      if (isBackendReason(error, "resource-not-found")) {
        return { ok: false, reason: "not-owned" };
      }
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async drawGacha(count: GachaDrawCount): Promise<GachaDrawResult> {
    try {
      const mutation = await this.api.drawGameGacha(createRequestId(), count);
      const rewards = parseGachaRewards(mutation.result.rewards);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, rewards, remainingCoins: mutation.snapshot.balance };
    } catch (error) {
      if (isBackendReason(error, "resource-not-found")) {
        return { ok: false, reason: "catalog-updating" };
      }
      return {
        ok: false,
        reason: isBackendReason(error, "insufficient-coins") ? "insufficient-coins" : "server-unavailable",
      };
    }
  }

  async selectCat(variant: CatVariant): Promise<CatSelectionResult> {
    try {
      const mutation = await this.api.selectGameCat(variant);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, activeCat: mutation.snapshot.activeCatKey as CatVariant };
    } catch (error) {
      return {
        ok: false,
        reason: isBackendReason(error, "resource-not-found") ? "cat-not-owned" : "server-unavailable",
      };
    }
  }

  async setCatHome(variant: CatVariant, visible: boolean): Promise<CatHomeResult> {
    try {
      const mutation = await this.api.setGameCatHome(variant, visible);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, homeCats: [...this.state.homeCats] };
    } catch (error) {
      return {
        ok: false,
        reason: isBackendReason(error, "resource-not-found") ? "cat-not-owned" : "server-unavailable",
      };
    }
  }

  getQuiz(quizId: string): QuizView | null {
    const task = this.tasks.get(quizId);
    if (task?.type !== "MULTIPLE_CHOICE" || !task.options) {
      return null;
    }
    return {
      id: task.publicId,
      title: { text: cleanTaskTitle(task.title) },
      summary: { text: learningDescription(task.description) },
      prompt: { text: learningDescription(task.description) },
      choices: Object.entries(task.options).map(([id, text]) => ({ id, label: { text } })),
      rewardCoins: task.rewardCoins,
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
      const attempt = await this.api.grade({
        requestId: createRequestId(),
        taskPublicId: quizId,
        selectedOption: choiceId,
        usedHint: false,
      });
      if (attempt.status !== "COMPLETED" || attempt.correct === null) {
        return { ok: false, reason: "grading-failed" };
      }
      if (attempt.correct) {
        task.completed = true;
        const [snapshot, proficiencies] = await Promise.all([
          this.api.getGameSnapshot(),
          this.api.getLearningProficiencies(),
        ]);
        this.mastery = toStudyMastery(proficiencies);
        this.applyServerSnapshot(snapshot);
      }
      return {
        ok: true,
        correct: attempt.correct,
        feedbackMessage: attempt.correct ? "study.correct" : "study.serverAnswerIncorrect",
        firstCompletion: attempt.coinsAwarded > 0,
        coinsAwarded: attempt.coinsAwarded,
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

  getStudyMastery(): StudyMasteryView {
    return this.mastery.map((entry) => ({ ...entry }));
  }

  getCodeChallenge(challengeId: string): CodeChallengeView | null {
    const task = this.tasks.get(challengeId);
    if (task?.type !== "CODE") {
      return null;
    }
    return {
      ...toStudyTaskView(task),
      type: "code",
      language: task.domain === "SQL" ? "sql" : "python",
      prompt: { text: learningDescription(task.description) },
      starterCode: task.templateCode,
      examples: { messageId: "study.serverExamples" },
      hints: task.hintText ? [{ text: task.hintText }] : [],
      bonusCoins: 0,
    };
  }

  async submitCodeChallenge(challengeId: string, code: string, hintsUsed: number): Promise<CodeSubmissionResult> {
    const task = this.tasks.get(challengeId);
    if (task?.type !== "CODE") {
      return { ok: false, reason: "challenge-not-found" };
    }
    if (!code.trim()) {
      return { ok: false, reason: "empty-code" };
    }
    const submittedCode = task.domain === "SQL" ? normalizeSqlWhitespace(code) : code;
    try {
      const attempt = await this.api.grade({
        requestId: createRequestId(),
        taskPublicId: challengeId,
        submittedCode,
        usedHint: hintsUsed > 0,
      });
      if (attempt.status !== "COMPLETED" || attempt.correct === null) {
        return { ok: false, reason: "grading-failed" };
      }
      if (attempt.correct) {
        task.completed = true;
        const [snapshot, proficiencies] = await Promise.all([
          this.api.getGameSnapshot(),
          this.api.getLearningProficiencies(),
        ]);
        this.mastery = toStudyMastery(proficiencies);
        this.applyServerSnapshot(snapshot);
      }
      return {
        ok: true,
        passed: attempt.correct,
        tests: [],
        firstCompletion: attempt.coinsAwarded > 0,
        coinsAwarded: attempt.coinsAwarded,
        serverAuthoritative: true,
      };
    } catch (error) {
      console.warn("Backend code grading failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  getDailyQuests(): DailyQuestView[] {
    return dailyQuestDefinitions.map((quest) => {
      const completedCount = this.state.dailyCompletedTaskIds.length;
      let progress = Math.min(quest.target, completedCount);
      if (quest.id === "finish-code") {
        progress = this.dailyHasCodeCompletion ? 1 : 0;
      }
      return {
        ...quest,
        progress,
        complete: progress >= quest.target,
        claimed: this.state.claimedDailyQuestIds.includes(quest.id),
      };
    });
  }

  async claimDailyQuest(questId: DailyQuestId): Promise<DailyRewardResult> {
    try {
      const mutation = await this.api.claimGameDailyReward(questId);
      const coinsAwarded = readResultNumber(mutation.result, "coins_awarded");
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, coinsAwarded };
    } catch (error) {
      if (isBackendReason(error, "already-claimed")) {
        await this.refreshSnapshotAfterConflict();
        return { ok: false, reason: "already-claimed" };
      }
      if (isBackendReason(error, "reward-not-ready")) {
        await this.refreshSnapshotAfterConflict();
        return { ok: false, reason: "not-complete" };
      }
      console.warn("Backend daily quest claim failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async claimDailyBonus(): Promise<DailyRewardResult> {
    try {
      const mutation = await this.api.claimGameDailyReward("bonus");
      const coinsAwarded = readResultNumber(mutation.result, "coins_awarded");
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, coinsAwarded };
    } catch (error) {
      if (isBackendReason(error, "already-claimed")) {
        await this.refreshSnapshotAfterConflict();
        return { ok: false, reason: "already-claimed" };
      }
      if (isBackendReason(error, "reward-not-ready")) {
        await this.refreshSnapshotAfterConflict();
        return { ok: false, reason: "bonus-not-ready" };
      }
      console.warn("Backend daily bonus claim failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  getAttendance(): AttendanceView {
    const today = utcDateStamp(new Date());
    const canClaim = this.state.attendanceLastClaimDate !== today;
    const nextStreak = nextAttendanceStreak(this.state.attendanceLastClaimDate, this.state.attendanceStreak, today);
    const streakBonus = canClaim ? attendanceStreakBonus(nextStreak) : 0;
    return {
      today,
      canClaim,
      currentStreak: this.state.attendanceStreak,
      nextStreak,
      longestStreak: this.state.attendanceLongestStreak,
      claimedDates: [...this.state.attendanceClaimedDates],
      dailyCoins: ATTENDANCE_DAILY_COINS,
      streakBonus,
      totalCoins: canClaim ? ATTENDANCE_DAILY_COINS + streakBonus : 0,
      cycleRewards: Array.from({ length: 7 }, (_, index) => attendanceRewardForCycleDay(index + 1)),
    };
  }

  async claimAttendance(): Promise<AttendanceClaimResult> {
    try {
      const mutation = await this.api.claimGameAttendance();
      const result = mutation.result;
      const claimedDate = readResultString(result, "claimed_date");
      const currentStreak = readResultNumber(result, "current_streak");
      const dailyCoins = readResultNumber(result, "daily_coins");
      const streakBonus = readResultNumber(result, "streak_bonus");
      const coinsAwarded = readResultNumber(result, "coins_awarded");
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, claimedDate, currentStreak, dailyCoins, streakBonus, coinsAwarded };
    } catch (error) {
      if (isBackendReason(error, "already-claimed")) {
        return { ok: false, reason: "already-claimed" };
      }
      console.warn("Backend attendance claim failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async resetLearningProgress(): Promise<LearningResetResult> {
    try {
      const mutation = await this.api.resetGameLearning();
      const [tasks, proficiencies] = await Promise.all([
        this.api.getLearningRecommendations(10),
        this.api.getLearningProficiencies(),
      ]);
      this.tasks.clear();
      for (const task of tasks) {
        this.tasks.set(task.publicId, task);
      }
      this.mastery = toStudyMastery(proficiencies);
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true };
    } catch (error) {
      console.warn("Backend learning reset failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async clearCatMemories(): Promise<CatMemoryClearResult> {
    try {
      const mutation = await this.api.clearGameCatMemories();
      this.applyServerSnapshot(mutation.snapshot);
      return { ok: true, removed: readResultNumber(mutation.result, "removed") };
    } catch (error) {
      console.warn("Backend cat memory clear failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async talkToCat(catVariant: CatVariant, topic: CatConversationTopic): Promise<CatConversationResult> {
    const catAssetPublicId = this.catAssetPublicIds.get(catVariant);
    if (!catAssetPublicId) {
      return { ok: false, reason: "cat-not-owned" };
    }
    try {
      await this.api.addCatMemory(catAssetPublicId, catConversationMemorySummary(topic));
      this.applyServerSnapshot(await this.api.getGameSnapshot());
      return {
        ok: true,
        catVariant,
        topic,
        memoryCount: this.state.catMemories[catVariant]?.length ?? 0,
      };
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        return { ok: false, reason: "cat-not-owned" };
      }
      console.warn("Backend cat conversation memory failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async chatWithCat(
    catVariant: CatVariant,
    userMessage: string,
    recentMessages = [] as readonly import("../core/GameClient").CatChatMessage[],
  ): Promise<CatFreeConversationResult> {
    if (!userMessage.trim()) {
      return { ok: false, reason: "empty-message" };
    }
    const catAssetPublicId = this.catAssetPublicIds.get(catVariant);
    if (!catAssetPublicId) {
      return { ok: false, reason: "cat-not-owned" };
    }
    try {
      const chat = await this.api.chatWithCat(catAssetPublicId, userMessage.slice(0, 240), recentMessages);
      if (chat.remembered) {
        this.applyServerSnapshot(await this.api.getGameSnapshot());
      }
      return {
        ok: true,
        catVariant,
        reply: { text: chat.reply },
        category: classifyLocalCatChat(userMessage),
        memoryCount: this.state.catMemories[catVariant]?.length ?? 0,
        remembered: chat.remembered,
      };
    } catch (error) {
      if (error instanceof BackendApiError && error.status === 404) {
        return { ok: false, reason: "cat-not-owned" };
      }
      console.warn("Backend cat chat failed", error);
      return { ok: false, reason: "server-unavailable" };
    }
  }

  async updateSettings(patch: Partial<GameSettings>): Promise<GameSettings> {
    try {
      const learningDomainChanged =
        patch.learningDomain !== undefined && patch.learningDomain !== this.state.settings.learningDomain;
      const mutation = await this.api.updateGameSettings(patch);
      this.applyServerSnapshot(mutation.snapshot);
      if (learningDomainChanged) {
        this.tasks.clear();
        const [tasks, proficiencies] = await Promise.all([
          this.api.getLearningRecommendations(10),
          this.api.getLearningProficiencies(),
        ]);
        for (const task of tasks) {
          this.tasks.set(task.publicId, task);
        }
        this.mastery = toStudyMastery(proficiencies);
        this.state = mergeTaskProgress(this.state, this.tasks.values());
        this.emit();
      }
    } catch (error) {
      console.warn("Backend settings update failed", error);
    }
    return { ...this.state.settings };
  }

  private applyServerSnapshot(snapshot: BackendGameSnapshot): void {
    if (snapshot.stateVersion < this.stateVersion) {
      return;
    }
    this.state = mergeTaskProgress(mergeServerSnapshot(this.state, snapshot), this.tasks.values());
    this.dailyHasCodeCompletion = snapshot.dailyHasCodeCompletion;
    this.stateVersion = snapshot.stateVersion;
    this.syncCatAssetPublicIds(snapshot);
    this.snapshotGeneration += 1;
    this.emit();
  }

  private syncCatAssetPublicIds(snapshot: BackendGameSnapshot): void {
    this.catAssetPublicIds.clear();
    for (const cat of snapshot.cats) {
      if (cat.owned && cat.assetPublicId && isCatVariant(cat.catalogKey)) {
        this.catAssetPublicIds.set(cat.catalogKey, cat.assetPublicId);
      }
    }
  }

  private async refreshSnapshotAfterConflict(): Promise<void> {
    try {
      this.applyServerSnapshot(await this.api.getGameSnapshot());
    } catch (error) {
      console.warn("Backend state refresh after daily reward conflict failed", error);
    }
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function normalizeSqlWhitespace(source: string): string {
  return source.replaceAll("\u00a0", " ");
}

const canonicalItemIds: Record<FurnitureKind, ShopItemId> = {
  sofa: "furniture.sofa",
  desk: "furniture.table",
  plant: "decor.plant",
  catTree: "furniture.catTower",
  bed: "furniture.bed",
  rug: "furniture.forest.rug",
  hideout: "furniture.forest.hideout",
  scratcher: "furniture.forest.scratcher",
  litterBox: "furniture.forest.litter-box",
};

function mergeServerSnapshot(base: GameState, server: BackendGameSnapshot): GameState {
  const ownedCats = server.cats.flatMap<CatVariant>((cat) =>
    cat.owned && isCatVariant(cat.catalogKey) ? [cat.catalogKey] : [],
  );
  const homeCats = server.cats.flatMap<CatVariant>((cat) =>
    cat.isHome && isCatVariant(cat.catalogKey) ? [cat.catalogKey] : [],
  );
  const catMemories: GameState["catMemories"] = {};
  for (const cat of server.cats) {
    if (cat.owned && isCatVariant(cat.catalogKey) && cat.memories.length > 0) {
      catMemories[cat.catalogKey] = [...cat.memories];
    }
  }
  const activeCat: CatVariant = isCatVariant(server.activeCatKey)
    ? server.activeCatKey
    : (ownedCats[0] ?? base.activeCat);
  const inventory: Record<FurnitureKind, number> = {
    sofa: 0,
    desk: 0,
    plant: 0,
    catTree: 0,
    bed: 0,
    rug: 0,
    hideout: 0,
    scratcher: 0,
    litterBox: 0,
  };
  const shopInventory: Partial<Record<ShopItemId, number>> = {};
  const itemKinds = new Map<ShopItemId, FurnitureKind>();

  for (const item of server.items) {
    if (!isShopItemId(item.catalogKey)) {
      continue;
    }
    shopInventory[item.catalogKey] = item.availableQuantity;
    if (item.category !== "FURNITURE" || !isFurnitureKind(item.furnitureKind)) {
      continue;
    }
    inventory[item.furnitureKind] += item.availableQuantity;
    itemKinds.set(item.catalogKey, item.furnitureKind);
  }

  const furniture = server.placements.flatMap((placement) => {
    if (!isShopItemId(placement.itemCatalogKey)) {
      return [];
    }
    const kind = itemKinds.get(placement.itemCatalogKey);
    if (!kind) {
      return [];
    }
    return [
      {
        id: placement.publicId,
        kind,
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
        shopItemId: placement.itemCatalogKey,
      },
    ];
  });

  return {
    ...base,
    coins: server.balance,
    ownedCats,
    homeCats,
    activeCat,
    settings: { ...server.settings },
    furniture,
    inventory,
    shopInventory,
    activeWallpaper: isShopItemId(server.activeWallpaperKey) ? server.activeWallpaperKey : null,
    activeFloor: isShopItemId(server.activeFloorKey) ? server.activeFloorKey : null,
    attendanceLastClaimDate: server.attendanceLastClaimDate,
    attendanceStreak: server.attendanceStreak,
    attendanceLongestStreak: server.attendanceLongestStreak,
    attendanceClaimedDates: [...server.attendanceClaimedDates],
    dailyQuestDate: server.dailyQuestDate,
    dailyCompletedTaskIds: [...server.dailyCompletedTaskIds],
    claimedDailyQuestIds: [...server.claimedDailyQuestIds],
    dailyBonusClaimed: server.dailyBonusClaimed,
    catMemories,
  };
}

function mergeTaskProgress(current: GameState, tasks: Iterable<BackendLearningTask>): GameState {
  const completedQuizIds: string[] = [];
  const completedCodeChallengeIds: string[] = [];
  for (const task of tasks) {
    if (!task.completed) {
      continue;
    }
    if (task.type === "CODE") {
      completedCodeChallengeIds.push(task.publicId);
    } else {
      completedQuizIds.push(task.publicId);
    }
  }
  return {
    ...current,
    completedQuizIds,
    completedCodeChallengeIds,
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    ownedCats: [...state.ownedCats],
    homeCats: [...state.homeCats],
    completedQuizIds: [...state.completedQuizIds],
    completedCodeChallengeIds: [...state.completedCodeChallengeIds],
    dailyCompletedTaskIds: [...state.dailyCompletedTaskIds],
    claimedDailyQuestIds: [...state.claimedDailyQuestIds],
    attendanceClaimedDates: [...state.attendanceClaimedDates],
    catMemories: Object.fromEntries(
      Object.entries(state.catMemories).map(([key, memories]) => [key, memories ? [...memories] : memories]),
    ),
    settings: { ...state.settings },
    furniture: state.furniture.map((item) => ({ ...item })),
    inventory: { ...state.inventory },
    shopInventory: { ...state.shopInventory },
  };
}

function isCatVariant(value: string): value is CatVariant {
  return catVariants.includes(value as CatVariant);
}

function isShopItemId(value: string | null): value is ShopItemId {
  return value !== null && Object.hasOwn(shopItemDefinitions, value);
}

function isFurnitureKind(value: string | null): value is FurnitureKind {
  return value !== null && Object.hasOwn(canonicalItemIds, value);
}

function placementFailure(error: unknown): Extract<PlacementResult, { ok: false }>["reason"] {
  if (isBackendReason(error, "outside-room")) {
    return "outside-room";
  }
  if (isBackendReason(error, "occupied")) {
    return "occupied";
  }
  if (isBackendReason(error, "not-owned") || isBackendReason(error, "resource-not-found")) {
    return "not-owned";
  }
  return "server-unavailable";
}

function isBackendReason(error: unknown, reason: string): boolean {
  return error instanceof BackendApiError && error.message === reason;
}

function parseGachaRewards(value: unknown): GachaReward[] {
  if (!Array.isArray(value)) {
    throw new Error("Backend gacha rewards are invalid");
  }
  const allowedIds = new Set(gachaRewardDefinitions.map((definition) => definition.id));
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Backend gacha reward is invalid");
    }
    const record = entry as Record<string, unknown>;
    const id = record.id;
    const kind = record.kind;
    if (typeof id !== "string" || !allowedIds.has(id as GachaReward["id"])) {
      throw new Error("Backend gacha reward ID is invalid");
    }
    if (kind !== "cat" && kind !== "furniture") {
      throw new Error("Backend gacha reward kind is invalid");
    }
    const catVariant =
      typeof record.cat_variant === "string" && isCatVariant(record.cat_variant) ? record.cat_variant : undefined;
    const shopItemId =
      typeof record.shop_item_id === "string" && isShopItemId(record.shop_item_id) ? record.shop_item_id : undefined;
    if (typeof record.duplicate !== "boolean" || typeof record.exchange_coins !== "number") {
      throw new Error("Backend gacha reward fields are invalid");
    }
    return {
      id: id as GachaReward["id"],
      kind,
      catVariant,
      shopItemId,
      duplicate: record.duplicate,
      exchangeCoins: record.exchange_coins,
    };
  });
}

function createRequestId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) =>
    (Number(digit) ^ ((Math.random() * 16) >> (Number(digit) / 4))).toString(16),
  );
}

function readResultString(result: Record<string, unknown>, key: string): string {
  const value = result[key];
  if (typeof value !== "string") {
    throw new Error(`Backend mutation field ${key} is invalid`);
  }
  return value;
}

function readResultNumber(result: Record<string, unknown>, key: string): number {
  const value = result[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Backend mutation field ${key} is invalid`);
  }
  return value;
}

function utcDateStamp(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toStudyTaskView(task: BackendLearningTask): StudyTaskView {
  return {
    id: task.publicId,
    type: task.type === "CODE" ? "code" : "quiz",
    concept: mapConcept(task.conceptName),
    difficulty: mapDifficulty(task.difficulty),
    title: { text: cleanTaskTitle(task.title) },
    summary: { text: learningDescription(task.description) },
    rewardCoins: task.rewardCoins,
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

function toStudyMastery(proficiencies: BackendConceptProficiency[]): StudyMasteryView {
  return proficiencies.map((proficiency) => ({
    conceptName: proficiency.conceptName,
    attempts: proficiency.attempts,
    proficiencyLevel: proficiency.proficiencyLevel,
  }));
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
