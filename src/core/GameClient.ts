import type { MessageId } from "../content/messages";
import type { CatChatCategory, CatConversationTopic } from "../domain/catConversation";
import type { CatVariant } from "../domain/cats";
import type { DailyQuestId } from "../domain/dailyQuest";
import type { GachaDrawCount, GachaRewardId } from "../domain/gacha";
import type { FurnitureKind, GameSettings, GameState } from "../domain/room";
import type { ConsumableEffect, ShopItemId } from "../domain/shop";
import type { CodeTestResult, StudyConcept, StudyDifficulty, StudyTaskType } from "../domain/study";

/** 가구 배치를 요청할 때 UI가 게임 시스템에 전달하는 직렬화 가능한 명령이다. */
export type PlacementCommand = {
  kind: FurnitureKind;
  x: number;
  y: number;
  rotation: 0 | 1;
  shopItemId?: ShopItemId;
};

export type MoveFurnitureCommand = { x: number; y: number; rotation: 0 | 1 };

/** 가구 배치의 성공 결과 또는 UI가 처리할 수 있는 실패 이유다. */
export type PlacementResult =
  | { ok: true; instanceId: string }
  | { ok: false; reason: "outside-room" | "occupied" | "not-owned" | "server-unavailable" };

export type PurchaseResult =
  | {
      ok: true;
      itemId: ShopItemId;
      itemType: "furniture";
      furnitureKind: FurnitureKind;
      remainingCoins: number;
    }
  | {
      ok: true;
      itemId: ShopItemId;
      itemType: "wallpaper" | "floor" | "consumable";
      remainingCoins: number;
    }
  | { ok: false; reason: "item-not-found" | "insufficient-coins" | "already-owned" | "server-unavailable" };

export type ApplyRoomThemeResult =
  | { ok: true; itemId: ShopItemId | null; itemType: "wallpaper" | "floor" }
  | { ok: false; reason: "item-not-found" | "not-owned" | "not-theme" | "server-unavailable" };

export type UseConsumableResult =
  | { ok: true; itemId: ShopItemId; effect: ConsumableEffect; remainingQuantity: number }
  | { ok: false; reason: "item-not-found" | "not-consumable" | "not-owned" | "cat-not-owned" | "server-unavailable" };

export type GachaReward = {
  id: GachaRewardId;
  kind: "cat" | "furniture";
  catVariant?: CatVariant;
  shopItemId?: ShopItemId;
  duplicate: boolean;
  exchangeCoins: number;
};

export type GachaDrawResult =
  | { ok: true; rewards: GachaReward[]; remainingCoins: number }
  | { ok: false; reason: "insufficient-coins" | "server-unavailable" };

export type CatSelectionResult =
  | { ok: true; activeCat: CatVariant }
  | { ok: false; reason: "cat-not-owned" | "server-unavailable" };

export type CatHomeResult =
  | { ok: true; homeCats: CatVariant[] }
  | { ok: false; reason: "cat-not-owned" | "server-unavailable" };

export type CatChatMessage = { role: "user" | "assistant"; text: string };

/** 로컬 메시지 키 또는 서버가 검증해 내려준 동적 학습 문구다. */
export type GameText = { messageId: MessageId } | { text: string };

export type QuizChoiceView = { id: string; label: GameText };

/** 게임 시스템이 UI에 공개하는 퀴즈 표시 모델이다. 정답은 의도적으로 포함하지 않는다. */
export type QuizView = {
  id: string;
  title: GameText;
  summary: GameText;
  prompt: GameText;
  choices: QuizChoiceView[];
  rewardCoins: number;
  completed: boolean;
};

/** 선택지 제출 결과다. 사용자 문구 대신 JSON 카탈로그의 메시지 키를 반환한다. */
export type QuizAnswerResult =
  | {
      ok: true;
      correct: boolean;
      feedbackMessage: MessageId;
      firstCompletion: boolean;
      coinsAwarded: number;
      serverAuthoritative?: boolean;
    }
  | { ok: false; reason: "quiz-not-found" | "choice-not-found" | "server-unavailable" | "grading-failed" };

export type StudyTaskView = {
  id: string;
  type: StudyTaskType;
  concept: StudyConcept;
  difficulty: StudyDifficulty;
  title: GameText;
  summary: GameText;
  rewardCoins: number;
  completed: boolean;
};

export type StudyMasteryView = Record<StudyConcept, number>;

export type CodeChallengeView = StudyTaskView & {
  type: "code";
  language: "python" | "sql";
  prompt: GameText;
  starterCode: string;
  examples: GameText;
  hints: readonly GameText[];
  bonusCoins: number;
};

export type CodeSubmissionResult =
  | {
      ok: true;
      passed: boolean;
      tests: CodeTestResult[];
      firstCompletion: boolean;
      coinsAwarded: number;
      serverAuthoritative?: boolean;
    }
  | {
      ok: false;
      reason: "challenge-not-found" | "empty-code" | "server-unavailable" | "grading-failed";
    };

export type Awaitable<T> = T | Promise<T>;

export type DailyQuestView = {
  id: DailyQuestId;
  titleMessage: MessageId;
  descriptionMessage: MessageId;
  progress: number;
  target: number;
  rewardCoins: number;
  complete: boolean;
  claimed: boolean;
};

export type DailyRewardResult =
  | { ok: true; coinsAwarded: number }
  | {
      ok: false;
      reason: "quest-not-found" | "not-complete" | "already-claimed" | "bonus-not-ready" | "server-unavailable";
    };

export type AttendanceView = {
  today: string;
  canClaim: boolean;
  currentStreak: number;
  nextStreak: number;
  longestStreak: number;
  claimedDates: string[];
  dailyCoins: number;
  streakBonus: number;
  totalCoins: number;
  cycleRewards: number[];
};

export type AttendanceClaimResult =
  | {
      ok: true;
      claimedDate: string;
      currentStreak: number;
      dailyCoins: number;
      streakBonus: number;
      coinsAwarded: number;
    }
  | { ok: false; reason: "already-claimed" | "server-unavailable" };

export type LearningResetResult = { ok: true } | { ok: false; reason: "server-unavailable" };

export type CatMemoryClearResult = { ok: true; removed: number } | { ok: false; reason: "server-unavailable" };

export type CatConversationResult =
  | { ok: true; catVariant: CatVariant; topic: CatConversationTopic; memoryCount: number }
  | { ok: false; reason: "cat-not-owned" | "server-unavailable" };

export type CatFreeConversationResult =
  | {
      ok: true;
      catVariant: CatVariant;
      reply: GameText;
      category: CatChatCategory;
      memoryCount: number;
      remembered: boolean;
    }
  | { ok: false; reason: "empty-message" | "cat-not-owned" | "server-unavailable" };

/** 상태가 커밋될 때 복제된 스냅샷을 받는 구독 함수다. */
export type GameStateListener = (snapshot: GameState) => void;

/** 게임 상태 저장 어댑터가 구현해야 하는 최소 계약이다. */
export interface GameStateRepository {
  /**
   * 저장 매체에서 완전한 게임 상태를 읽는다.
   *
   * @returns 호출자가 수정해도 저장 매체의 값이 바뀌지 않는 `GameState` 스냅샷.
   *
   * @remarks
   * 구현체는 데이터가 없거나 손상되었거나 이전 스키마인 경우를 처리해야 한다.
   * 복구 방법과 마이그레이션은 저장 어댑터의 책임이며 게임 규칙에 포함하지 않는다.
   */
  load(): GameState;

  /**
   * 완전한 최신 게임 상태를 저장 매체에 기록한다.
   *
   * @param state - 직렬화 가능한 최신 상태 전체. 부분 업데이트가 아니다.
   *
   * @remarks
   * 저장 구현은 전달받은 객체를 이후에 직접 변경하지 않아야 한다. 영속화 실패를
   * 복구할 수 없는 구현은 오류를 호출자에게 전파한다.
   */
  save(state: GameState): void;
}

/**
 * UI가 의존하는 게임 시스템의 유일한 공개 계약이다.
 * PixiJS 타입이나 렌더 객체를 이 경계에 추가하지 않는다.
 */
export interface GameClient {
  /**
   * 현재 게임 상태의 읽기용 스냅샷을 반환한다.
   *
   * @returns 내부 배열과 인스턴스가 복제된 현재 `GameState`.
   *
   * @remarks 반환값을 UI가 수정해도 게임 시스템의 내부 상태나 저장 데이터는 변경되지 않는다.
   */
  getSnapshot(): GameState;

  /**
   * 성공적으로 커밋된 이후의 상태 변경을 구독한다.
   *
   * @param listener - 각 커밋 뒤 복제된 최신 스냅샷을 받을 콜백.
   * @returns 이 listener만 제거하는 해제 함수. 여러 번 호출해도 추가 효과가 없다.
   *
   * @remarks 구독 시점의 상태를 즉시 보내지 않으므로 초기 렌더링에는 `getSnapshot()`을 먼저 사용한다.
   */
  subscribe(listener: GameStateListener): () => void;

  /**
   * 공터 경계와 기존 가구의 점유 셀을 검증한 뒤 가구 인스턴스를 배치한다.
   *
   * @param command - 가구 원형, 논리 격자 좌표와 회전 상태를 담은 배치 명령.
   * @returns 성공 시 새 인스턴스 ID, 실패 시 `outside-room` 또는 `occupied` 이유.
   *
   * @remarks 실패한 명령은 상태를 저장하지 않고 구독자에게도 알리지 않는다.
   */
  placeFurniture(command: PlacementCommand): Awaitable<PlacementResult>;

  /** 기존 가구를 인벤토리로 회수하지 않고 새 위치로 원자적으로 이동한다. 실패하면 원래 배치를 유지한다. */
  moveFurniture(instanceId: string, command: MoveFurnitureCommand): Awaitable<PlacementResult>;

  /**
   * 배치된 가구 인스턴스를 공터 상태에서 제거한다.
   *
   * @param instanceId - `PlacedFurniture.id` 또는 성공한 배치 결과로 받은 ID.
   * @returns 인스턴스를 찾아 제거했으면 `true`, 존재하지 않아 상태가 그대로이면 `false`.
   *
   * @remarks
   * 현재 로컬 프로토타입은 인벤토리 소유권을 별도로 저장하지 않는다. 서버 인벤토리가
   * 추가되면 이 명령은 소유권을 유지한 채 공터 배치만 회수해야 하며, 성공한 경우에만 상태를 커밋한다.
   */
  removeFurniture(instanceId: string): Awaitable<boolean>;

  /**
   * 상점 상품의 가격과 잔액을 검증하고 구매한 가구를 보유함에 추가한다.
   *
   * @param itemId - 게임 시스템이 소유하는 안정적인 상점 상품 ID.
   * @returns 성공 시 가구 종류와 남은 재화, 실패 시 처리 가능한 실패 이유.
   *
   * @remarks 성공한 구매만 상태를 저장하고 구독자에게 새 스냅샷을 알린다.
   */
  buyShopItem(itemId: ShopItemId): Awaitable<PurchaseResult>;

  /**
   * 보유한 간식 한 개를 소비하고 선택한 고양이의 긍정적 반응 종류를 반환한다.
   *
   * @param itemId - `consumable` 종류로 등록된 안정적인 상점 상품 ID.
   * @param catVariant - 간식을 받을 현재 보유 고양이 종류.
   * @returns 성공 시 표시할 반응과 남은 수량, 실패 시 UI가 처리할 수 있는 이유.
   *
   * @remarks 원격 클라이언트에서는 수량 차감과 멱등 처리를 서버가 권위 있게 결정한다.
   */
  useConsumable(itemId: ShopItemId, catVariant: CatVariant): Awaitable<UseConsumableResult>;

  /** 보유한 벽지 또는 바닥재를 현재 방 테마로 적용한다. */
  applyRoomTheme(itemId: ShopItemId | null): Awaitable<ApplyRoomThemeResult>;

  /** 코인을 차감하고 가중치에 따라 고양이 또는 가구 보상을 지급한다. */
  drawGacha(count: GachaDrawCount): Awaitable<GachaDrawResult>;

  /** 보유한 고양이를 메인 공터에서 함께 지낼 고양이로 선택한다. */
  selectCat(variant: CatVariant): Awaitable<CatSelectionResult>;

  /**
   * 보유한 고양이를 홈 공터에 표시하거나 보관함으로 옮긴다.
   *
   * @param variant - 표시 상태를 바꿀 보유 고양이 종류.
   * @param visible - `true`면 홈에 배치하고 `false`면 보관한다.
   * @returns 성공 시 갱신된 홈 고양이 목록, 미보유 고양이면 실패 이유.
   */
  setCatHome(variant: CatVariant, visible: boolean): Awaitable<CatHomeResult>;

  /**
   * UI가 렌더링할 수 있는 퀴즈 표시 모델을 조회한다.
   *
   * @param quizId - 문제 은행에서 사용하는 안정적인 퀴즈 ID.
   * @returns 퀴즈가 있으면 메시지 키와 선택지, 보상 정보; 없으면 `null`.
   *
   * @remarks 반환 모델에는 정답 선택지 ID가 포함되지 않으며 조회 자체는 상태를 변경하지 않는다.
   */
  getQuiz(quizId: string): QuizView | null;

  /**
   * 선택지를 판정하고 퀴즈별 최초 정답 보상을 게임 상태에 반영한다.
   *
   * @param quizId - 답안을 제출할 퀴즈 ID.
   * @param choiceId - `getQuiz()` 결과에서 사용자가 선택한 선택지 ID.
   * @returns 판정·보상·피드백 메시지 키 또는 처리할 수 없는 ID의 실패 이유.
   *
   * @remarks
   * 오답과 이미 완료한 퀴즈의 재정답은 재화를 지급하거나 상태를 커밋하지 않는다.
   * UI는 `feedbackMessage`를 JSON 메시지 카탈로그에서 해석해야 한다.
   */
  answerQuiz(quizId: string, choiceId: string): Awaitable<QuizAnswerResult>;

  /** 학습 홈에 표시할 과제 목록과 완료 상태를 반환한다. */
  getStudyTasks(): StudyTaskView[];

  /** 최근 채점 기록으로 서버 또는 로컬 저장소가 계산한 개념별 숙련도를 반환한다. */
  getStudyMastery(): StudyMasteryView;

  /** 전체 시작 코드를 자유롭게 편집할 수 있는 코드 과제를 조회한다. */
  getCodeChallenge(challengeId: string): CodeChallengeView | null;

  /** 안전한 로컬 채점기를 통해 코드 과제를 채점하고 최초 완료 보상을 반영한다. */
  submitCodeChallenge(challengeId: string, code: string, hintsUsed: number): Awaitable<CodeSubmissionResult>;

  /** 오늘의 학습 기록에서 계산한 퀘스트 진행도와 수령 상태를 반환한다. */
  getDailyQuests(): DailyQuestView[];

  /** 완료한 개별 데일리 퀘스트 보상을 한 번만 지급한다. */
  claimDailyQuest(questId: DailyQuestId): Awaitable<DailyRewardResult>;

  /** 모든 데일리 퀘스트 보상을 수령한 뒤 최종 보너스를 지급한다. */
  claimDailyBonus(): Awaitable<DailyRewardResult>;

  /** 오늘의 출석 가능 여부와 7일 연속 보상판을 조회한다. */
  getAttendance(): AttendanceView;

  /** 로컬 날짜 기준 오늘 출석을 한 번만 인정하고 일일·연속 보상을 함께 지급한다. */
  claimAttendance(): Awaitable<AttendanceClaimResult>;

  /** 학습 진도만 초기화하며 보상 감사 기록, 재화, 보유 가구와 고양이는 유지한다. */
  resetLearningProgress(): Awaitable<LearningResetResult>;

  /** 세션 간 저장된 모든 고양이 기억 문장을 삭제하고 처리 결과를 반환한다. */
  clearCatMemories(): Awaitable<CatMemoryClearResult>;

  /**
   * 보유 고양이와 선택한 주제로 대화한 사실을 해당 고양이의 기억에 남긴다.
   *
   * @param catVariant - 대화할 보유 고양이 종류.
   * @param topic - UI가 제시한 안전한 대화 주제.
   * @returns 성공 시 갱신된 고양이별 기억 개수, 실패 시 처리 가능한 이유.
   * @remarks 답변 문구와 화면 동작은 UI가 페르소나 표현 규칙으로 결정하며 이 명령은 기억 상태만 변경한다.
   */
  talkToCat(catVariant: CatVariant, topic: CatConversationTopic): Awaitable<CatConversationResult>;

  /**
   * 보유 고양이에게 자유 문장을 보내고 검증된 짧은 답변을 받는다.
   *
   * @param catVariant - 대화할 보유 고양이 종류.
   * @param userMessage - 한글 IME 입력을 포함할 수 있는 최대 240자의 사용자 문장.
   * @returns 답변과 서버 분류, 기억 저장 여부 또는 처리 가능한 실패 이유.
   * @remarks 원격 구현은 사용자 원문을 기억에 저장하지 않으며 프롬프트 제어 시도를 생성 모델에 전달하지 않는다.
   */
  chatWithCat(
    catVariant: CatVariant,
    userMessage: string,
    recentMessages?: readonly CatChatMessage[],
  ): Awaitable<CatFreeConversationResult>;

  /** 사운드와 접근성 환경설정을 저장하고 최신 설정을 반환한다. */
  updateSettings(patch: Partial<GameSettings>): Awaitable<GameSettings>;
}
