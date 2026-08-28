import type { MessageId } from "../content/messages";

export const DAILY_QUIZ_ID = "python-range-001";

/** 선택지의 시스템 ID와 JSON 메시지 키다. */
export type QuizChoice = {
  id: string;
  labelMessage: MessageId;
};

/** 판정, 표시 메시지 키, 최초 완료 보상을 포함하는 퀴즈 원형이다. */
export type QuizDefinition = {
  id: string;
  titleMessage: MessageId;
  promptMessage: MessageId;
  choices: QuizChoice[];
  correctChoiceId: string;
  correctFeedbackMessage: MessageId;
  incorrectFeedbackMessage: MessageId;
  rewardCoins: number;
};

export const quizDefinitions: Record<string, QuizDefinition> = {
  [DAILY_QUIZ_ID]: {
    id: DAILY_QUIZ_ID,
    titleMessage: "study.dailyTitle",
    promptMessage: "study.rangePrompt",
    choices: [
      { id: "one-to-three", labelMessage: "study.choiceOneToThree" },
      { id: "zero-to-two", labelMessage: "study.choiceZeroToTwo" },
      { id: "zero-to-three", labelMessage: "study.choiceZeroToThree" },
    ],
    correctChoiceId: "zero-to-two",
    correctFeedbackMessage: "study.correct",
    incorrectFeedbackMessage: "study.rangeIncorrect",
    rewardCoins: 25,
  },
};
