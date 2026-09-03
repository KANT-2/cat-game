import type { MessageId } from "../content/messages";
import type { GameState } from "./room";
import { SUM_CODE_ID } from "./study";

export type DailyQuestId = "solve-one" | "solve-three" | "finish-code";

export type DailyQuestDefinition = {
  id: DailyQuestId;
  titleMessage: MessageId;
  descriptionMessage: MessageId;
  target: number;
  rewardCoins: number;
};

export const dailyQuestDefinitions: readonly DailyQuestDefinition[] = [
  {
    id: "solve-one",
    titleMessage: "daily.missionOneTitle",
    descriptionMessage: "daily.missionOneDescription",
    target: 1,
    rewardCoins: 50,
  },
  {
    id: "solve-three",
    titleMessage: "daily.missionThreeTitle",
    descriptionMessage: "daily.missionThreeDescription",
    target: 3,
    rewardCoins: 100,
  },
  {
    id: "finish-code",
    titleMessage: "daily.missionCodeTitle",
    descriptionMessage: "daily.missionCodeDescription",
    target: 1,
    rewardCoins: 150,
  },
];

export function dailyQuestProgress(state: GameState, questId: DailyQuestId): number {
  const completedCount = state.dailyCompletedTaskIds.length;
  if (questId === "solve-one") {
    return Math.min(1, completedCount);
  }
  if (questId === "solve-three") {
    return Math.min(3, completedCount);
  }
  return state.dailyCompletedTaskIds.includes(SUM_CODE_ID) ? 1 : 0;
}
