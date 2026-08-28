import type { GameStateRepository } from "../core/GameClient";
import { createDefaultState, type GameState } from "../domain/room";

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
      return {
        coins: typeof saved.coins === "number" ? saved.coins : fallback.coins,
        gems: typeof saved.gems === "number" ? saved.gems : fallback.gems,
        completedQuizIds: readCompletedQuizIds(saved.completedQuizIds, legacyRewardedQuiz),
        furniture: Array.isArray(saved.furniture) ? saved.furniture : fallback.furniture,
      };
    } catch {
      return fallback;
    }
  }

  save(state: GameState): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
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
