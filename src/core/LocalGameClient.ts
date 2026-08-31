import {
  furnitureDefinitions,
  type GameState,
  isPlacementFree,
  ROOM_GRID_HEIGHT,
  ROOM_GRID_WIDTH,
  rotatedSize,
} from "../domain/room";
import { type ShopItemId, shopItemDefinitions } from "../domain/shop";
import { quizDefinitions } from "../domain/study";
import type {
  GameClient,
  GameStateListener,
  GameStateRepository,
  PlacementCommand,
  PlacementResult,
  PurchaseResult,
  QuizAnswerResult,
  QuizView,
} from "./GameClient";

export class LocalGameClient implements GameClient {
  private state: GameState;
  private readonly listeners = new Set<GameStateListener>();

  constructor(private readonly store: GameStateRepository) {
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
    };
    this.commit();
    return true;
  }

  buyShopItem(itemId: ShopItemId): PurchaseResult {
    const item = shopItemDefinitions[itemId];
    if (!item) {
      return { ok: false, reason: "item-not-found" };
    }
    if (item.currency === "coins" && this.state.coins < item.price) {
      return { ok: false, reason: "insufficient-coins" };
    }
    if (item.currency === "gems" && this.state.gems < item.price) {
      return { ok: false, reason: "insufficient-gems" };
    }
    this.state = {
      ...this.state,
      coins: item.currency === "coins" ? this.state.coins - item.price : this.state.coins,
      gems: item.currency === "gems" ? this.state.gems - item.price : this.state.gems,
      inventory: {
        ...this.state.inventory,
        [item.furnitureKind]: this.state.inventory[item.furnitureKind] + 1,
      },
    };
    this.commit();
    return {
      ok: true,
      itemId,
      furnitureKind: item.furnitureKind,
      remainingCoins: this.state.coins,
      remainingGems: this.state.gems,
    };
  }

  getQuiz(quizId: string): QuizView | null {
    const quiz = quizDefinitions[quizId];
    if (!quiz) {
      return null;
    }
    return {
      id: quiz.id,
      titleMessage: quiz.titleMessage,
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

    if (this.state.completedQuizIds.includes(quizId)) {
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
    furniture: state.furniture.map((item) => ({ ...item })),
    inventory: { ...state.inventory },
  };
}

function createInstanceId(kind: string): string {
  return `${kind}-${Date.now()}-${Math.round(Math.random() * 999)}`;
}
