import {
  ATTENDANCE_DAILY_COINS,
  attendanceRewardForCycleDay,
  attendanceStreakBonus,
  nextAttendanceStreak,
} from "../domain/attendance";
import type { CatVariant } from "../domain/cats";
import { type DailyQuestId, dailyQuestDefinitions, dailyQuestProgress } from "../domain/dailyQuest";
import { drawGachaRewards, GACHA_DUPLICATE_CAT_COINS, type GachaDrawCount, gachaCost } from "../domain/gacha";
import {
  furnitureDefinitions,
  type GameSettings,
  type GameState,
  isPlacementFree,
  ROOM_GRID_HEIGHT,
  ROOM_GRID_WIDTH,
  rotatedSize,
} from "../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../domain/shop";
import { codeChallengeDefinitions, gradeSumChallenge, quizDefinitions, studyTaskDefinitions } from "../domain/study";
import type {
  ApplyRoomThemeResult,
  AttendanceClaimResult,
  AttendanceView,
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
  GameStateRepository,
  MoveFurnitureCommand,
  PlacementCommand,
  PlacementResult,
  PurchaseResult,
  QuizAnswerResult,
  QuizView,
  StudyTaskView,
} from "./GameClient";

export class LocalGameClient implements GameClient {
  private state: GameState;
  private readonly listeners = new Set<GameStateListener>();

  constructor(
    private readonly store: GameStateRepository,
    private readonly random: () => number = () => Math.random(),
    private readonly now: () => Date = () => new Date(),
  ) {
    this.state = store.load();
  }

  getSnapshot(): GameState {
    return cloneState(this.state);
  }

  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  placeFurniture(command: PlacementCommand): PlacementResult {
    if (this.state.inventory[command.kind] <= 0) {
      return { ok: false, reason: "not-owned" };
    }
    if (command.shopItemId) {
      const product = shopItemDefinitions[command.shopItemId];
      if (
        product?.kind !== "furniture" ||
        product.furnitureKind !== command.kind ||
        (this.state.shopInventory[command.shopItemId] ?? 0) <= 0
      ) {
        return { ok: false, reason: "not-owned" };
      }
    }
    const definition = furnitureDefinitions[command.kind];
    const size = rotatedSize(definition, command.rotation);
    if (
      command.x < 0 ||
      command.y < 0 ||
      command.x + size.width > ROOM_GRID_WIDTH ||
      command.y + size.height > ROOM_GRID_HEIGHT
    ) {
      return { ok: false, reason: "outside-room" };
    }
    if (
      !isPlacementFree(
        this.state.furniture,
        ROOM_GRID_WIDTH,
        ROOM_GRID_HEIGHT,
        command.x,
        command.y,
        size.width,
        size.height,
      )
    ) {
      return { ok: false, reason: "occupied" };
    }

    const instanceId = createInstanceId(command.kind);
    this.state = {
      ...this.state,
      furniture: [...this.state.furniture, { id: instanceId, ...command }],
      inventory: { ...this.state.inventory, [command.kind]: this.state.inventory[command.kind] - 1 },
      shopInventory: command.shopItemId
        ? { ...this.state.shopInventory, [command.shopItemId]: (this.state.shopInventory[command.shopItemId] ?? 0) - 1 }
        : this.state.shopInventory,
    };
    this.commit();
    return { ok: true, instanceId };
  }

  moveFurniture(instanceId: string, command: MoveFurnitureCommand): PlacementResult {
    const existing = this.state.furniture.find((item) => item.id === instanceId);
    if (!existing) {
      return { ok: false, reason: "not-owned" };
    }
    const definition = furnitureDefinitions[existing.kind];
    const size = rotatedSize(definition, command.rotation);
    if (
      command.x < 0 ||
      command.y < 0 ||
      command.x + size.width > ROOM_GRID_WIDTH ||
      command.y + size.height > ROOM_GRID_HEIGHT
    ) {
      return { ok: false, reason: "outside-room" };
    }
    const otherFurniture = this.state.furniture.filter((item) => item.id !== instanceId);
    if (
      !isPlacementFree(otherFurniture, ROOM_GRID_WIDTH, ROOM_GRID_HEIGHT, command.x, command.y, size.width, size.height)
    ) {
      return { ok: false, reason: "occupied" };
    }
    this.state = {
      ...this.state,
      furniture: this.state.furniture.map((item) => (item.id === instanceId ? { ...item, ...command } : item)),
    };
    this.commit();
    return { ok: true, instanceId };
  }

  removeFurniture(instanceId: string): boolean {
    const removed = this.state.furniture.find((item) => item.id === instanceId);
    if (!removed) {
      return false;
    }
    const furniture = this.state.furniture.filter((item) => item.id !== instanceId);
    this.state = {
      ...this.state,
      furniture,
      inventory: { ...this.state.inventory, [removed.kind]: this.state.inventory[removed.kind] + 1 },
      shopInventory: removed.shopItemId
        ? { ...this.state.shopInventory, [removed.shopItemId]: (this.state.shopInventory[removed.shopItemId] ?? 0) + 1 }
        : this.state.shopInventory,
    };
    this.commit();
    return true;
  }

  buyShopItem(itemId: ShopItemId): PurchaseResult {
    const item = shopItemDefinitions[itemId];
    if (!item) {
      return { ok: false, reason: "item-not-found" };
    }
    if (this.state.coins < item.price) {
      return { ok: false, reason: "insufficient-coins" };
    }
    const inventory =
      item.kind === "furniture"
        ? { ...this.state.inventory, [item.furnitureKind]: this.state.inventory[item.furnitureKind] + 1 }
        : this.state.inventory;
    this.state = {
      ...this.state,
      coins: this.state.coins - item.price,
      inventory,
      shopInventory: {
        ...this.state.shopInventory,
        [itemId]: (this.state.shopInventory[itemId] ?? 0) + 1,
      },
    };
    this.commit();
    if (item.kind === "furniture") {
      return {
        ok: true,
        itemId,
        itemType: item.kind,
        furnitureKind: item.furnitureKind,
        remainingCoins: this.state.coins,
      };
    }
    return { ok: true, itemId, itemType: item.kind, remainingCoins: this.state.coins };
  }

  applyRoomTheme(itemId: ShopItemId): ApplyRoomThemeResult {
    const item = shopItemDefinitions[itemId];
    if (!item) {
      return { ok: false, reason: "item-not-found" };
    }
    if (item.kind === "furniture") {
      return { ok: false, reason: "not-theme" };
    }
    if ((this.state.shopInventory[itemId] ?? 0) <= 0) {
      return { ok: false, reason: "not-owned" };
    }
    this.state = {
      ...this.state,
      activeWallpaper: item.kind === "wallpaper" ? itemId : this.state.activeWallpaper,
      activeFloor: item.kind === "floor" ? itemId : this.state.activeFloor,
    };
    this.commit();
    return { ok: true, itemId, itemType: item.kind };
  }

  drawGacha(count: GachaDrawCount): GachaDrawResult {
    const cost = gachaCost(count);
    if (this.state.coins < cost) {
      return { ok: false, reason: "insufficient-coins" };
    }

    const ownedCats = [...this.state.ownedCats];
    const inventory = { ...this.state.inventory };
    const shopInventory = { ...this.state.shopInventory };
    let coins = this.state.coins - cost;
    const definitions = drawGachaRewards(count, this.random);
    const rewards = definitions.map((definition) => {
      let duplicate = false;
      let exchangeCoins = 0;
      if (definition.kind === "cat" && definition.catVariant) {
        duplicate = ownedCats.includes(definition.catVariant);
        if (duplicate) {
          exchangeCoins = GACHA_DUPLICATE_CAT_COINS;
          coins += exchangeCoins;
        } else {
          ownedCats.push(definition.catVariant);
        }
      } else if (definition.kind === "furniture" && definition.shopItemId) {
        const item = shopItemDefinitions[definition.shopItemId];
        if (item.kind !== "furniture") {
          throw new Error("Gacha furniture reward must reference furniture");
        }
        inventory[item.furnitureKind] += 1;
        shopInventory[definition.shopItemId] = (shopInventory[definition.shopItemId] ?? 0) + 1;
      }
      return {
        id: definition.id,
        kind: definition.kind,
        catVariant: definition.catVariant,
        shopItemId: definition.shopItemId,
        duplicate,
        exchangeCoins,
      };
    });

    this.state = { ...this.state, coins, ownedCats, inventory, shopInventory };
    this.commit();
    return { ok: true, rewards, remainingCoins: coins };
  }

  selectCat(variant: CatVariant): CatSelectionResult {
    if (!this.state.ownedCats.includes(variant)) {
      return { ok: false, reason: "cat-not-owned" };
    }
    const homeCats = this.state.homeCats.includes(variant) ? this.state.homeCats : [...this.state.homeCats, variant];
    if (this.state.activeCat === variant && homeCats === this.state.homeCats) {
      return { ok: true, activeCat: variant };
    }
    this.state = { ...this.state, activeCat: variant, homeCats };
    this.commit();
    return { ok: true, activeCat: variant };
  }

  setCatHome(variant: CatVariant, visible: boolean): CatHomeResult {
    if (!this.state.ownedCats.includes(variant)) {
      return { ok: false, reason: "cat-not-owned" };
    }
    const currentlyVisible = this.state.homeCats.includes(variant);
    if (currentlyVisible === visible) {
      return { ok: true, homeCats: [...this.state.homeCats] };
    }
    const homeCats = visible
      ? [...this.state.homeCats, variant]
      : this.state.homeCats.filter((candidate) => candidate !== variant);
    const activeCat =
      !visible && this.state.activeCat === variant && homeCats.length > 0 ? homeCats[0] : this.state.activeCat;
    this.state = { ...this.state, homeCats, activeCat };
    this.commit();
    return { ok: true, homeCats: [...homeCats] };
  }

  getQuiz(quizId: string): QuizView | null {
    const quiz = quizDefinitions[quizId];
    if (!quiz) {
      return null;
    }
    return {
      id: quiz.id,
      titleMessage: quiz.titleMessage,
      summaryMessage: quiz.summaryMessage,
      promptMessage: quiz.promptMessage,
      choices: quiz.choices.map((choice) => ({ ...choice })),
      rewardCoins: quiz.rewardCoins,
      completed: this.state.completedQuizIds.includes(quizId),
    };
  }

  answerQuiz(quizId: string, choiceId: string): QuizAnswerResult {
    const quiz = quizDefinitions[quizId];
    if (!quiz) {
      return { ok: false, reason: "quiz-not-found" };
    }
    if (!quiz.choices.some((choice) => choice.id === choiceId)) {
      return { ok: false, reason: "choice-not-found" };
    }
    if (choiceId !== quiz.correctChoiceId) {
      return {
        ok: true,
        correct: false,
        feedbackMessage: quiz.incorrectFeedbackMessage,
        firstCompletion: false,
        coinsAwarded: 0,
      };
    }
    this.ensureDailyState();

    const alreadyCompleted = this.state.completedQuizIds.includes(quizId);
    const completedToday = this.state.dailyCompletedTaskIds.includes(quizId);
    if (alreadyCompleted) {
      if (!completedToday) {
        this.state = { ...this.state, dailyCompletedTaskIds: [...this.state.dailyCompletedTaskIds, quizId] };
        this.commit();
      }
      return {
        ok: true,
        correct: true,
        feedbackMessage: quiz.correctFeedbackMessage,
        firstCompletion: false,
        coinsAwarded: 0,
      };
    }
    this.state = {
      ...this.state,
      completedQuizIds: [...this.state.completedQuizIds, quizId],
      dailyCompletedTaskIds: completedToday
        ? this.state.dailyCompletedTaskIds
        : [...this.state.dailyCompletedTaskIds, quizId],
      coins: this.state.coins + quiz.rewardCoins,
    };
    this.commit();
    return {
      ok: true,
      correct: true,
      feedbackMessage: quiz.correctFeedbackMessage,
      firstCompletion: true,
      coinsAwarded: quiz.rewardCoins,
    };
  }

  getStudyTasks(): StudyTaskView[] {
    return studyTaskDefinitions.map((task) => ({
      id: task.id,
      type: task.type,
      concept: task.concept,
      difficulty: task.difficulty,
      titleMessage: task.titleMessage,
      summaryMessage: task.summaryMessage,
      rewardCoins: task.rewardCoins,
      completed:
        task.type === "quiz"
          ? this.state.completedQuizIds.includes(task.id)
          : this.state.completedCodeChallengeIds.includes(task.id),
    }));
  }

  getCodeChallenge(challengeId: string): CodeChallengeView | null {
    const challenge = codeChallengeDefinitions[challengeId];
    if (!challenge) {
      return null;
    }
    return {
      id: challenge.id,
      type: challenge.type,
      concept: challenge.concept,
      difficulty: challenge.difficulty,
      titleMessage: challenge.titleMessage,
      summaryMessage: challenge.summaryMessage,
      promptMessage: challenge.promptMessage,
      rewardCoins: challenge.rewardCoins,
      completed: this.state.completedCodeChallengeIds.includes(challengeId),
      signature: challenge.signature,
      starterBody: challenge.starterBody,
      examplesMessage: challenge.examplesMessage,
      hintMessages: challenge.hintMessages,
      bonusCoins: challenge.bonusCoins,
    };
  }

  submitCodeChallenge(challengeId: string, body: string, hintsUsed: number): CodeSubmissionResult {
    this.ensureDailyState();
    const challenge = codeChallengeDefinitions[challengeId];
    if (!challenge) {
      return { ok: false, reason: "challenge-not-found" };
    }
    if (body.trim().length === 0) {
      return { ok: false, reason: "empty-code" };
    }
    const grade = gradeSumChallenge(body);
    if (!grade.passed) {
      return { ok: true, passed: false, tests: grade.tests, firstCompletion: false, coinsAwarded: 0 };
    }
    const alreadyCompleted = this.state.completedCodeChallengeIds.includes(challengeId);
    const completedToday = this.state.dailyCompletedTaskIds.includes(challengeId);
    if (alreadyCompleted) {
      if (!completedToday) {
        this.state = { ...this.state, dailyCompletedTaskIds: [...this.state.dailyCompletedTaskIds, challengeId] };
        this.commit();
      }
      return { ok: true, passed: true, tests: grade.tests, firstCompletion: false, coinsAwarded: 0 };
    }
    const safeHintsUsed = Math.max(0, Math.min(challenge.hintMessages.length, Math.floor(hintsUsed)));
    const bonus = Math.max(0, challenge.bonusCoins - safeHintsUsed * 10);
    const coinsAwarded = challenge.rewardCoins + bonus;
    this.state = {
      ...this.state,
      completedCodeChallengeIds: [...this.state.completedCodeChallengeIds, challengeId],
      dailyCompletedTaskIds: completedToday
        ? this.state.dailyCompletedTaskIds
        : [...this.state.dailyCompletedTaskIds, challengeId],
      coins: this.state.coins + coinsAwarded,
    };
    this.commit();
    return { ok: true, passed: true, tests: grade.tests, firstCompletion: true, coinsAwarded };
  }

  getDailyQuests(): DailyQuestView[] {
    this.ensureDailyState();
    return dailyQuestDefinitions.map((quest) => {
      const progress = dailyQuestProgress(this.state, quest.id);
      return {
        ...quest,
        progress,
        complete: progress >= quest.target,
        claimed: this.state.claimedDailyQuestIds.includes(quest.id),
      };
    });
  }

  claimDailyQuest(questId: DailyQuestId): DailyRewardResult {
    this.ensureDailyState();
    const quest = dailyQuestDefinitions.find((candidate) => candidate.id === questId);
    if (!quest) {
      return { ok: false, reason: "quest-not-found" };
    }
    if (this.state.claimedDailyQuestIds.includes(questId)) {
      return { ok: false, reason: "already-claimed" };
    }
    if (dailyQuestProgress(this.state, questId) < quest.target) {
      return { ok: false, reason: "not-complete" };
    }
    this.state = {
      ...this.state,
      coins: this.state.coins + quest.rewardCoins,
      claimedDailyQuestIds: [...this.state.claimedDailyQuestIds, questId],
    };
    this.commit();
    return { ok: true, coinsAwarded: quest.rewardCoins };
  }

  claimDailyBonus(): DailyRewardResult {
    this.ensureDailyState();
    if (this.state.dailyBonusClaimed) {
      return { ok: false, reason: "already-claimed" };
    }
    if (this.state.claimedDailyQuestIds.length < dailyQuestDefinitions.length) {
      return { ok: false, reason: "bonus-not-ready" };
    }
    this.state = { ...this.state, coins: this.state.coins + 310, dailyBonusClaimed: true };
    this.commit();
    return { ok: true, coinsAwarded: 310 };
  }

  getAttendance(): AttendanceView {
    const today = this.localDateStamp();
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

  claimAttendance(): AttendanceClaimResult {
    const attendance = this.getAttendance();
    if (!attendance.canClaim) {
      return { ok: false, reason: "already-claimed" };
    }
    const currentStreak = attendance.nextStreak;
    const coinsAwarded = attendance.dailyCoins + attendance.streakBonus;
    const claimedDates = [
      ...this.state.attendanceClaimedDates.filter((date) => date !== attendance.today),
      attendance.today,
    ];
    this.state = {
      ...this.state,
      coins: this.state.coins + coinsAwarded,
      attendanceLastClaimDate: attendance.today,
      attendanceStreak: currentStreak,
      attendanceLongestStreak: Math.max(this.state.attendanceLongestStreak, currentStreak),
      attendanceClaimedDates: claimedDates.slice(-62),
    };
    this.commit();
    return {
      ok: true,
      claimedDate: attendance.today,
      currentStreak,
      dailyCoins: attendance.dailyCoins,
      streakBonus: attendance.streakBonus,
      coinsAwarded,
    };
  }

  resetLearningProgress(): void {
    this.ensureDailyState();
    this.state = {
      ...this.state,
      completedQuizIds: [],
      completedCodeChallengeIds: [],
      dailyCompletedTaskIds: [],
      claimedDailyQuestIds: [],
      dailyBonusClaimed: false,
    };
    this.commit();
  }

  clearCatMemories(): CatMemoryClearResult {
    const removed = Object.values(this.state.catMemories).reduce((sum, memories) => sum + (memories?.length ?? 0), 0);
    this.state = { ...this.state, catMemories: {} };
    this.commit();
    return { ok: true, removed };
  }

  updateSettings(patch: Partial<GameSettings>): GameSettings {
    const next = {
      ...this.state.settings,
      ...patch,
      bgmVolume: clampPercent(patch.bgmVolume ?? this.state.settings.bgmVolume),
      effectsVolume: clampPercent(patch.effectsVolume ?? this.state.settings.effectsVolume),
    };
    this.state = { ...this.state, settings: next };
    this.commit();
    return { ...next };
  }

  private ensureDailyState(): void {
    const today = this.localDateStamp();
    if (this.state.dailyQuestDate === today) {
      return;
    }
    this.state = {
      ...this.state,
      dailyQuestDate: today,
      dailyCompletedTaskIds: [],
      claimedDailyQuestIds: [],
      dailyBonusClaimed: false,
    };
    this.commit();
  }

  private localDateStamp(): string {
    const date = this.now();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private commit(): void {
    this.store.save(this.state);
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    completedQuizIds: [...state.completedQuizIds],
    completedCodeChallengeIds: [...state.completedCodeChallengeIds],
    dailyCompletedTaskIds: [...state.dailyCompletedTaskIds],
    claimedDailyQuestIds: [...state.claimedDailyQuestIds],
    attendanceClaimedDates: [...state.attendanceClaimedDates],
    catMemories: Object.fromEntries(
      Object.entries(state.catMemories).map(([variant, memories]) => [variant, memories ? [...memories] : memories]),
    ),
    settings: { ...state.settings },
    ownedCats: [...state.ownedCats],
    homeCats: [...state.homeCats],
    furniture: state.furniture.map((item) => ({ ...item })),
    inventory: { ...state.inventory },
    shopInventory: { ...state.shopInventory },
  };
}

function createInstanceId(kind: string): string {
  return `${kind}-${Date.now()}-${Math.round(Math.random() * 999)}`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value / 10) * 10));
}
