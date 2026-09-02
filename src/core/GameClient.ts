import type { MessageId } from "../content/messages";
import type { CatVariant } from "../domain/cats";
import type { GachaDrawCount, GachaRarity, GachaRewardId } from "../domain/gacha";
import type { FurnitureKind, GameState } from "../domain/room";
import type { ShopItemId } from "../domain/shop";
import type { QuizChoice } from "../domain/study";

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
  | { ok: false; reason: "outside-room" | "occupied" | "not-owned" };

export type PurchaseResult =
  | { ok: true; itemId: ShopItemId; furnitureKind: FurnitureKind; remainingCoins: number; remainingGems: number }
  | { ok: false; reason: "item-not-found" | "insufficient-coins" | "insufficient-gems" };

export type GachaReward = {
  id: GachaRewardId;
  rarity: GachaRarity;
  kind: "cat" | "furniture";
  catVariant?: CatVariant;
  shopItemId?: ShopItemId;
  duplicate: boolean;
  exchangeGems: number;
};

export type GachaDrawResult =
  | { ok: true; rewards: GachaReward[]; remainingGems: number }
  | { ok: false; reason: "insufficient-gems" };

export type CatSelectionResult = { ok: true; activeCat: CatVariant } | { ok: false; reason: "cat-not-owned" };

export type CatHomeResult = { ok: true; homeCats: CatVariant[] } | { ok: false; reason: "cat-not-owned" };

/** 게임 시스템이 UI에 공개하는 퀴즈 표시 모델이다. 정답은 의도적으로 포함하지 않는다. */
export type QuizView = {
  id: string;
  titleMessage: MessageId;
  promptMessage: MessageId;
  choices: QuizChoice[];
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
    }
  | { ok: false; reason: "quiz-not-found" | "choice-not-found" };

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
  placeFurniture(command: PlacementCommand): PlacementResult;

  /** 기존 가구를 인벤토리로 회수하지 않고 새 위치로 원자적으로 이동한다. 실패하면 원래 배치를 유지한다. */
  moveFurniture(instanceId: string, command: MoveFurnitureCommand): PlacementResult;

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
  removeFurniture(instanceId: string): boolean;

  /**
   * 상점 상품의 가격과 잔액을 검증하고 구매한 가구를 보유함에 추가한다.
   *
   * @param itemId - 게임 시스템이 소유하는 안정적인 상점 상품 ID.
   * @returns 성공 시 가구 종류와 남은 재화, 실패 시 처리 가능한 실패 이유.
   *
   * @remarks 성공한 구매만 상태를 저장하고 구독자에게 새 스냅샷을 알린다.
   */
  buyShopItem(itemId: ShopItemId): PurchaseResult;

  /** 지폐를 차감하고 공개 확률과 10+1 보장 규칙에 따라 고양이 또는 가구 보상을 지급한다. */
  drawGacha(count: GachaDrawCount): GachaDrawResult;

  /** 보유한 고양이를 메인 공터에서 함께 지낼 고양이로 선택한다. */
  selectCat(variant: CatVariant): CatSelectionResult;

  /**
   * 보유한 고양이를 홈 공터에 표시하거나 보관함으로 옮긴다.
   *
   * @param variant - 표시 상태를 바꿀 보유 고양이 종류.
   * @param visible - `true`면 홈에 배치하고 `false`면 보관한다.
   * @returns 성공 시 갱신된 홈 고양이 목록, 미보유 고양이면 실패 이유.
   */
  setCatHome(variant: CatVariant, visible: boolean): CatHomeResult;

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
  answerQuiz(quizId: string, choiceId: string): QuizAnswerResult;
}
