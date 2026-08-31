import type { GameStateRepository } from "../core/GameClient";
import { createDefaultState, type FurnitureKind, type GameState } from "../domain/room";

const SAVE_KEY = "cozy-code-cat-room-v1";

export class GameStateStore implements GameStateRepository {
  load(): GameState {
    const fallback = createDefaultState();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return fallback;
      }
      const saved = JSON.parse(raw) as Partial<GameState>;
      const legacyRewardedQuiz = (saved as Partial<GameState> & { rewardedQuiz?: boolean }).rewardedQuiz;
      const currentEconomy = saved.economyVersion === 1;
      return {
        economyVersion: 1,
        coins: currentEconomy && typeof saved.coins === "number" ? saved.coins : fallback.coins,
        gems: typeof saved.gems === "number" ? saved.gems : fallback.gems,
        completedQuizIds: readCompletedQuizIds(saved.completedQuizIds, legacyRewardedQuiz),
        furniture: Array.isArray(saved.furniture) ? saved.furniture : fallback.furniture,
        inventory: readInventory(saved.inventory, fallback.inventory),
      };
    } catch {
      return fallback;
    }
  }

  save(state: GameState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
}

function readInventory(value: unknown, fallback: Record<FurnitureKind, number>): Record<FurnitureKind, number> {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }
  const saved = value as Partial<Record<FurnitureKind, unknown>>;
  return {
    sofa: readCount(saved.sofa, fallback.sofa),
    desk: readCount(saved.desk, fallback.desk),
    plant: readCount(saved.plant, fallback.plant),
    catTree: readCount(saved.catTree, fallback.catTree),
    bed: readCount(saved.bed, fallback.bed),
  };
}

function readCount(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readCompletedQuizIds(value: unknown, legacyRewardedQuiz: boolean | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === "string");
  }
  if (legacyRewardedQuiz === true) {
    return ["python-range-001"];
  }
  return [];
}
