import type { MessageId } from "../content/messages";

export const DAILY_QUIZ_ID = "python-range-001";
export const VARIABLE_QUIZ_ID = "python-variable-001";
export const CONDITIONAL_QUIZ_ID = "python-conditional-001";
export const SUM_CODE_ID = "python-sum-001";

export type StudyTaskType = "quiz" | "code";
export type StudyConcept = "variables" | "conditionals" | "loops" | "functions";
export type StudyDifficulty = "basic" | "applied" | "challenge";

export type QuizChoice = { id: string; labelMessage: MessageId };

export type QuizDefinition = {
  id: string;
  type: "quiz";
  concept: StudyConcept;
  difficulty: StudyDifficulty;
  titleMessage: MessageId;
  summaryMessage: MessageId;
  promptMessage: MessageId;
  choices: QuizChoice[];
  correctChoiceId: string;
  correctFeedbackMessage: MessageId;
  incorrectFeedbackMessage: MessageId;
  rewardCoins: number;
};

export type CodeChallengeDefinition = {
  id: string;
  type: "code";
  concept: StudyConcept;
  difficulty: StudyDifficulty;
  titleMessage: MessageId;
  summaryMessage: MessageId;
  promptMessage: MessageId;
  signature: string;
  starterBody: string;
  examplesMessage: MessageId;
  hintMessages: readonly MessageId[];
  rewardCoins: number;
  bonusCoins: number;
};

export type StudyTaskDefinition = QuizDefinition | CodeChallengeDefinition;

export const quizDefinitions: Record<string, QuizDefinition> = {
  [DAILY_QUIZ_ID]: {
    id: DAILY_QUIZ_ID,
    type: "quiz",
    concept: "loops",
    difficulty: "basic",
    titleMessage: "study.dailyTitle",
    summaryMessage: "study.rangeSummary",
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
  [VARIABLE_QUIZ_ID]: {
    id: VARIABLE_QUIZ_ID,
    type: "quiz",
    concept: "variables",
    difficulty: "basic",
    titleMessage: "study.variablesStringsTitle",
    summaryMessage: "study.variablesStringsSummary",
    promptMessage: "study.variablesStringsPrompt",
    choices: [
      { id: "cat-message", labelMessage: "study.variablesStringsChoiceCorrect" },
      { id: "variable-message", labelMessage: "study.variablesStringsChoiceVariable" },
      { id: "literal-code", labelMessage: "study.variablesStringsChoiceCode" },
    ],
    correctChoiceId: "cat-message",
    correctFeedbackMessage: "study.variablesStringsCorrect",
    incorrectFeedbackMessage: "study.variablesStringsIncorrect",
    rewardCoins: 25,
  },
  [CONDITIONAL_QUIZ_ID]: {
    id: CONDITIONAL_QUIZ_ID,
    type: "quiz",
    concept: "conditionals",
    difficulty: "applied",
    titleMessage: "study.conditionalTitle",
    summaryMessage: "study.conditionalSummary",
    promptMessage: "study.conditionalPrompt",
    choices: [
      { id: "pass", labelMessage: "study.conditionalChoicePass" },
      { id: "retry", labelMessage: "study.conditionalChoiceRetry" },
      { id: "score", labelMessage: "study.conditionalChoiceScore" },
    ],
    correctChoiceId: "pass",
    correctFeedbackMessage: "study.conditionalCorrect",
    incorrectFeedbackMessage: "study.conditionalIncorrect",
    rewardCoins: 30,
  },
};

export const codeChallengeDefinitions: Record<string, CodeChallengeDefinition> = {
  [SUM_CODE_ID]: {
    id: SUM_CODE_ID,
    type: "code",
    concept: "functions",
    difficulty: "challenge",
    titleMessage: "study.sumTitle",
    summaryMessage: "study.sumSummary",
    promptMessage: "study.sumPrompt",
    signature: "def sum_to(n):",
    starterBody: "    total = 0\n    ",
    examplesMessage: "study.sumExamples",
    hintMessages: ["study.sumHintOne", "study.sumHintTwo", "study.sumHintThree"],
    rewardCoins: 40,
    bonusCoins: 20,
  },
};

export const studyTaskDefinitions: readonly StudyTaskDefinition[] = [
  quizDefinitions[VARIABLE_QUIZ_ID],
  quizDefinitions[CONDITIONAL_QUIZ_ID],
  quizDefinitions[DAILY_QUIZ_ID],
  codeChallengeDefinitions[SUM_CODE_ID],
];

export type CodeTestResult = { input: number; expected: number; actual: number | null; passed: boolean };

/**
 * 브라우저에서 임의 Python을 실행하지 않고 합계 과제에 허용된 두 풀이 형태를 판정한다.
 *
 * @param body - 고정된 함수 선언 아래에서 사용자가 편집한 함수 본문.
 * @returns 공개·비공개 입력별 통과 여부와 전체 성공 여부.
 *
 * @remarks 반복문 누적 풀이와 정수 나눗셈 공식 풀이만 허용한다. 서버 채점기가 연결되기 전에도
 * 동일한 테스트 결과 계약을 유지하면서 코드 실행 공격면을 만들지 않기 위한 로컬 어댑터다.
 */
export function gradeSumChallenge(body: string): { passed: boolean; tests: CodeTestResult[] } {
  const normalized = body
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .join(" ")
    .replace(/\s+/g, " ");
  const totalIndex = normalized.search(/total\s*=\s*0/);
  const loopIndex = normalized.search(/for\s+\w+\s+in\s+range\(\s*1\s*,\s*n\s*\+\s*1\s*\)\s*:/);
  const addIndex = normalized.search(/total\s*\+=\s*\w+/);
  const returnIndex = normalized.search(/return\s+total/);
  const loopSolution = totalIndex >= 0 && loopIndex > totalIndex && addIndex > loopIndex && returnIndex > addIndex;
  const formulaSolution = /return\s+n\s*\*\s*\(\s*n\s*\+\s*1\s*\)\s*\/\/\s*2/.test(normalized);
  const valid = loopSolution || formulaSolution;
  const tests = [1, 5, 12].map((input) => {
    const expected = (input * (input + 1)) / 2;
    return { input, expected, actual: valid ? expected : null, passed: valid };
  });
  return { passed: tests.every((test) => test.passed), tests };
}
