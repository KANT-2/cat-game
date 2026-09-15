import type { MessageId } from "../content/messages";

export const DAILY_QUIZ_ID = "python-range-001";
export const VARIABLE_QUIZ_ID = "python-variable-001";
export const CONDITIONAL_QUIZ_ID = "python-conditional-001";
export const SUM_CODE_ID = "python-sum-001";
export const PYTHON_SQUARE_CODE_ID = "python-square-001";
export const PYTHON_ABSOLUTE_CODE_ID = "python-absolute-001";
export const PYTHON_LENGTH_CODE_ID = "python-length-001";
export const SQL_SELECT_QUIZ_ID = "sql-select-001";
export const SQL_WHERE_QUIZ_ID = "sql-where-001";
export const SQL_GROUP_BY_QUIZ_ID = "sql-group-by-001";
export const SQL_JOIN_QUIZ_ID = "sql-join-001";
export const SQL_ACTIVE_CATS_CODE_ID = "sql-active-cats-001";
export const SQL_BREED_COUNT_CODE_ID = "sql-breed-count-001";
export const SQL_OWNER_JOIN_CODE_ID = "sql-owner-join-001";
export const ML_SUPERVISED_QUIZ_ID = "machine-learning-supervised-001";
export const ML_SPLIT_QUIZ_ID = "machine-learning-split-001";
export const ML_OVERFITTING_QUIZ_ID = "machine-learning-overfitting-001";
export const ML_METRIC_QUIZ_ID = "machine-learning-metric-001";

export type StudyTaskType = "quiz" | "code";
export type StudyLanguage = "python" | "sql" | "machine-learning";
export type StudyCodeLanguage = Exclude<StudyLanguage, "machine-learning">;
export type StudyConcept =
  | "variables"
  | "conditionals"
  | "loops"
  | "functions"
  | "sql-select"
  | "sql-filter"
  | "sql-aggregate"
  | "sql-join"
  | "ml-foundations"
  | "ml-validation"
  | "ml-generalization"
  | "ml-evaluation"
  | "other";
export type StudyDifficulty = "basic" | "applied" | "challenge";
export type StudyCodeGrader =
  | "python-sum"
  | "python-square"
  | "python-absolute"
  | "python-length"
  | "sql-active-cats"
  | "sql-breed-count"
  | "sql-owner-join";

export type QuizChoice = { id: string; labelMessage: MessageId };

export type QuizDefinition = {
  id: string;
  type: "quiz";
  language: StudyLanguage;
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
  language: StudyCodeLanguage;
  grader: StudyCodeGrader;
  concept: StudyConcept;
  difficulty: StudyDifficulty;
  titleMessage: MessageId;
  summaryMessage: MessageId;
  promptMessage: MessageId;
  starterCode: string;
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
    language: "python",
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
    language: "python",
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
    language: "python",
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
  [SQL_SELECT_QUIZ_ID]: {
    id: SQL_SELECT_QUIZ_ID,
    type: "quiz",
    language: "sql",
    concept: "sql-select",
    difficulty: "basic",
    titleMessage: "study.sqlSelectTitle",
    summaryMessage: "study.sqlSelectSummary",
    promptMessage: "study.sqlSelectPrompt",
    choices: [
      { id: "select-name", labelMessage: "study.sqlSelectChoiceCorrect" },
      { id: "select-users", labelMessage: "study.sqlSelectChoiceUsers" },
      { id: "from-name", labelMessage: "study.sqlSelectChoiceFrom" },
    ],
    correctChoiceId: "select-name",
    correctFeedbackMessage: "study.sqlCorrect",
    incorrectFeedbackMessage: "study.sqlSelectIncorrect",
    rewardCoins: 25,
  },
  [SQL_WHERE_QUIZ_ID]: {
    id: SQL_WHERE_QUIZ_ID,
    type: "quiz",
    language: "sql",
    concept: "sql-filter",
    difficulty: "basic",
    titleMessage: "study.sqlWhereTitle",
    summaryMessage: "study.sqlWhereSummary",
    promptMessage: "study.sqlWherePrompt",
    choices: [
      { id: "where-age", labelMessage: "study.sqlWhereChoiceCorrect" },
      { id: "if-age", labelMessage: "study.sqlWhereChoiceIf" },
      { id: "order-age", labelMessage: "study.sqlWhereChoiceOrder" },
    ],
    correctChoiceId: "where-age",
    correctFeedbackMessage: "study.sqlCorrect",
    incorrectFeedbackMessage: "study.sqlWhereIncorrect",
    rewardCoins: 25,
  },
  [SQL_GROUP_BY_QUIZ_ID]: {
    id: SQL_GROUP_BY_QUIZ_ID,
    type: "quiz",
    language: "sql",
    concept: "sql-aggregate",
    difficulty: "applied",
    titleMessage: "study.sqlGroupByTitle",
    summaryMessage: "study.sqlGroupBySummary",
    promptMessage: "study.sqlGroupByPrompt",
    choices: [
      { id: "group-department", labelMessage: "study.sqlGroupByChoiceCorrect" },
      { id: "order-department", labelMessage: "study.sqlGroupByChoiceOrder" },
      { id: "distinct-count", labelMessage: "study.sqlGroupByChoiceDistinct" },
    ],
    correctChoiceId: "group-department",
    correctFeedbackMessage: "study.sqlCorrect",
    incorrectFeedbackMessage: "study.sqlGroupByIncorrect",
    rewardCoins: 30,
  },
  [SQL_JOIN_QUIZ_ID]: {
    id: SQL_JOIN_QUIZ_ID,
    type: "quiz",
    language: "sql",
    concept: "sql-join",
    difficulty: "challenge",
    titleMessage: "study.sqlJoinTitle",
    summaryMessage: "study.sqlJoinSummary",
    promptMessage: "study.sqlJoinPrompt",
    choices: [
      { id: "join-owner", labelMessage: "study.sqlJoinChoiceCorrect" },
      { id: "join-without-on", labelMessage: "study.sqlJoinChoiceWithoutOn" },
      { id: "union-owner", labelMessage: "study.sqlJoinChoiceUnion" },
    ],
    correctChoiceId: "join-owner",
    correctFeedbackMessage: "study.sqlCorrect",
    incorrectFeedbackMessage: "study.sqlJoinIncorrect",
    rewardCoins: 35,
  },
  [ML_SUPERVISED_QUIZ_ID]: {
    id: ML_SUPERVISED_QUIZ_ID,
    type: "quiz",
    language: "machine-learning",
    concept: "ml-foundations",
    difficulty: "basic",
    titleMessage: "study.mlSupervisedTitle",
    summaryMessage: "study.mlSupervisedSummary",
    promptMessage: "study.mlSupervisedPrompt",
    choices: [
      { id: "supervised", labelMessage: "study.mlSupervisedChoiceCorrect" },
      { id: "unsupervised", labelMessage: "study.mlSupervisedChoiceUnsupervised" },
      { id: "reinforcement", labelMessage: "study.mlSupervisedChoiceReinforcement" },
    ],
    correctChoiceId: "supervised",
    correctFeedbackMessage: "study.mlCorrect",
    incorrectFeedbackMessage: "study.mlSupervisedIncorrect",
    rewardCoins: 25,
  },
  [ML_SPLIT_QUIZ_ID]: {
    id: ML_SPLIT_QUIZ_ID,
    type: "quiz",
    language: "machine-learning",
    concept: "ml-validation",
    difficulty: "basic",
    titleMessage: "study.mlSplitTitle",
    summaryMessage: "study.mlSplitSummary",
    promptMessage: "study.mlSplitPrompt",
    choices: [
      { id: "unseen-performance", labelMessage: "study.mlSplitChoiceCorrect" },
      { id: "more-training", labelMessage: "study.mlSplitChoiceTraining" },
      { id: "remove-labels", labelMessage: "study.mlSplitChoiceLabels" },
    ],
    correctChoiceId: "unseen-performance",
    correctFeedbackMessage: "study.mlCorrect",
    incorrectFeedbackMessage: "study.mlSplitIncorrect",
    rewardCoins: 25,
  },
  [ML_OVERFITTING_QUIZ_ID]: {
    id: ML_OVERFITTING_QUIZ_ID,
    type: "quiz",
    language: "machine-learning",
    concept: "ml-generalization",
    difficulty: "applied",
    titleMessage: "study.mlOverfittingTitle",
    summaryMessage: "study.mlOverfittingSummary",
    promptMessage: "study.mlOverfittingPrompt",
    choices: [
      { id: "overfitting", labelMessage: "study.mlOverfittingChoiceCorrect" },
      { id: "underfitting", labelMessage: "study.mlOverfittingChoiceUnderfitting" },
      { id: "normalization", labelMessage: "study.mlOverfittingChoiceNormalization" },
    ],
    correctChoiceId: "overfitting",
    correctFeedbackMessage: "study.mlCorrect",
    incorrectFeedbackMessage: "study.mlOverfittingIncorrect",
    rewardCoins: 30,
  },
  [ML_METRIC_QUIZ_ID]: {
    id: ML_METRIC_QUIZ_ID,
    type: "quiz",
    language: "machine-learning",
    concept: "ml-evaluation",
    difficulty: "challenge",
    titleMessage: "study.mlMetricTitle",
    summaryMessage: "study.mlMetricSummary",
    promptMessage: "study.mlMetricPrompt",
    choices: [
      { id: "f1", labelMessage: "study.mlMetricChoiceCorrect" },
      { id: "accuracy", labelMessage: "study.mlMetricChoiceAccuracy" },
      { id: "mse", labelMessage: "study.mlMetricChoiceMse" },
    ],
    correctChoiceId: "f1",
    correctFeedbackMessage: "study.mlCorrect",
    incorrectFeedbackMessage: "study.mlMetricIncorrect",
    rewardCoins: 35,
  },
};

export const codeChallengeDefinitions: Record<string, CodeChallengeDefinition> = {
  [SUM_CODE_ID]: {
    id: SUM_CODE_ID,
    type: "code",
    language: "python",
    grader: "python-sum",
    concept: "functions",
    difficulty: "challenge",
    titleMessage: "study.sumTitle",
    summaryMessage: "study.sumSummary",
    promptMessage: "study.sumPrompt",
    starterCode: "def sum_to(n):\n    total = 0\n    ",
    examplesMessage: "study.sumExamples",
    hintMessages: ["study.sumHintOne", "study.sumHintTwo", "study.sumHintThree"],
    rewardCoins: 40,
    bonusCoins: 20,
  },
  [PYTHON_SQUARE_CODE_ID]: {
    id: PYTHON_SQUARE_CODE_ID,
    type: "code",
    language: "python",
    grader: "python-square",
    concept: "functions",
    difficulty: "basic",
    titleMessage: "study.pythonSquareTitle",
    summaryMessage: "study.pythonSquareSummary",
    promptMessage: "study.pythonSquarePrompt",
    starterCode: "def square(n):\n    ",
    examplesMessage: "study.pythonSquareExamples",
    hintMessages: ["study.pythonSquareHintOne", "study.pythonSquareHintTwo"],
    rewardCoins: 30,
    bonusCoins: 10,
  },
  [PYTHON_ABSOLUTE_CODE_ID]: {
    id: PYTHON_ABSOLUTE_CODE_ID,
    type: "code",
    language: "python",
    grader: "python-absolute",
    concept: "conditionals",
    difficulty: "applied",
    titleMessage: "study.pythonAbsoluteTitle",
    summaryMessage: "study.pythonAbsoluteSummary",
    promptMessage: "study.pythonAbsolutePrompt",
    starterCode: "def absolute(n):\n    ",
    examplesMessage: "study.pythonAbsoluteExamples",
    hintMessages: ["study.pythonAbsoluteHintOne", "study.pythonAbsoluteHintTwo"],
    rewardCoins: 35,
    bonusCoins: 15,
  },
  [PYTHON_LENGTH_CODE_ID]: {
    id: PYTHON_LENGTH_CODE_ID,
    type: "code",
    language: "python",
    grader: "python-length",
    concept: "functions",
    difficulty: "basic",
    titleMessage: "study.pythonLengthTitle",
    summaryMessage: "study.pythonLengthSummary",
    promptMessage: "study.pythonLengthPrompt",
    starterCode: "def item_count(items):\n    ",
    examplesMessage: "study.pythonLengthExamples",
    hintMessages: ["study.pythonLengthHintOne", "study.pythonLengthHintTwo"],
    rewardCoins: 30,
    bonusCoins: 10,
  },
  [SQL_ACTIVE_CATS_CODE_ID]: {
    id: SQL_ACTIVE_CATS_CODE_ID,
    type: "code",
    language: "sql",
    grader: "sql-active-cats",
    concept: "sql-filter",
    difficulty: "basic",
    titleMessage: "study.sqlActiveCatsTitle",
    summaryMessage: "study.sqlActiveCatsSummary",
    promptMessage: "study.sqlActiveCatsPrompt",
    starterCode: "SELECT name\nFROM cats\nWHERE active = true;",
    examplesMessage: "study.sqlActiveCatsExamples",
    hintMessages: ["study.sqlActiveCatsHintOne", "study.sqlActiveCatsHintTwo"],
    rewardCoins: 30,
    bonusCoins: 10,
  },
  [SQL_BREED_COUNT_CODE_ID]: {
    id: SQL_BREED_COUNT_CODE_ID,
    type: "code",
    language: "sql",
    grader: "sql-breed-count",
    concept: "sql-aggregate",
    difficulty: "applied",
    titleMessage: "study.sqlBreedCountTitle",
    summaryMessage: "study.sqlBreedCountSummary",
    promptMessage: "study.sqlBreedCountPrompt",
    starterCode: "SELECT breed, COUNT(*)\nFROM cats\nGROUP BY breed;",
    examplesMessage: "study.sqlBreedCountExamples",
    hintMessages: ["study.sqlBreedCountHintOne", "study.sqlBreedCountHintTwo"],
    rewardCoins: 35,
    bonusCoins: 15,
  },
  [SQL_OWNER_JOIN_CODE_ID]: {
    id: SQL_OWNER_JOIN_CODE_ID,
    type: "code",
    language: "sql",
    grader: "sql-owner-join",
    concept: "sql-join",
    difficulty: "challenge",
    titleMessage: "study.sqlOwnerJoinCodeTitle",
    summaryMessage: "study.sqlOwnerJoinCodeSummary",
    promptMessage: "study.sqlOwnerJoinCodePrompt",
    starterCode: "SELECT cats.name, owners.name\nFROM cats\nJOIN owners ON cats.owner_id = owners.id;",
    examplesMessage: "study.sqlOwnerJoinCodeExamples",
    hintMessages: ["study.sqlOwnerJoinCodeHintOne", "study.sqlOwnerJoinCodeHintTwo"],
    rewardCoins: 40,
    bonusCoins: 20,
  },
};

export const studyTaskDefinitions: readonly StudyTaskDefinition[] = [
  quizDefinitions[VARIABLE_QUIZ_ID],
  quizDefinitions[CONDITIONAL_QUIZ_ID],
  quizDefinitions[DAILY_QUIZ_ID],
  codeChallengeDefinitions[SUM_CODE_ID],
  codeChallengeDefinitions[PYTHON_SQUARE_CODE_ID],
  codeChallengeDefinitions[PYTHON_ABSOLUTE_CODE_ID],
  codeChallengeDefinitions[PYTHON_LENGTH_CODE_ID],
  quizDefinitions[SQL_SELECT_QUIZ_ID],
  quizDefinitions[SQL_WHERE_QUIZ_ID],
  quizDefinitions[SQL_GROUP_BY_QUIZ_ID],
  quizDefinitions[SQL_JOIN_QUIZ_ID],
  codeChallengeDefinitions[SQL_ACTIVE_CATS_CODE_ID],
  codeChallengeDefinitions[SQL_BREED_COUNT_CODE_ID],
  codeChallengeDefinitions[SQL_OWNER_JOIN_CODE_ID],
  quizDefinitions[ML_SUPERVISED_QUIZ_ID],
  quizDefinitions[ML_SPLIT_QUIZ_ID],
  quizDefinitions[ML_OVERFITTING_QUIZ_ID],
  quizDefinitions[ML_METRIC_QUIZ_ID],
];

export type CodeTestResult = {
  input: string | number;
  expected: string | number;
  actual: string | number | null;
  passed: boolean;
};

/**
 * 브라우저에서 임의 Python을 실행하지 않고 합계 과제에 허용된 두 풀이 형태를 판정한다.
 *
 * @param code - 함수 선언과 본문을 모두 포함한 사용자의 전체 답안 코드.
 * @returns 공개·비공개 입력별 통과 여부와 전체 성공 여부.
 *
 * @remarks 반복문 누적 풀이와 정수 나눗셈 공식 풀이만 허용한다. 서버 채점기가 연결되기 전에도
 * 동일한 테스트 결과 계약을 유지하면서 코드 실행 공격면을 만들지 않기 위한 로컬 어댑터다.
 */
export function gradeSumChallenge(code: string): { passed: boolean; tests: CodeTestResult[] } {
  const normalized = code
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
  const expectedFunction = /def\s+sum_to\s*\(\s*n\s*\)\s*:/.test(normalized);
  const valid = expectedFunction && (loopSolution || formulaSolution);
  const tests = [1, 5, 12].map((input) => {
    const expected = (input * (input + 1)) / 2;
    return { input: `n=${input}`, expected, actual: valid ? expected : null, passed: valid };
  });
  return { passed: tests.every((test) => test.passed), tests };
}

/** 등록된 로컬 코드 과제의 제한된 정답 형태를 안전하게 판정한다. */
export function gradeCodeChallenge(
  grader: StudyCodeGrader,
  body: string,
): { passed: boolean; tests: CodeTestResult[] } {
  if (grader === "python-sum") {
    return gradeSumChallenge(body);
  }
  const normalized = normalizeCode(body);
  if (grader === "python-square") {
    const valid = /return n \* n/.test(normalized) || /return n \*\* 2/.test(normalized);
    return fixedGrade(valid, [
      ["n=3", 9],
      ["n=-4", 16],
      ["n=0", 0],
    ]);
  }
  if (grader === "python-absolute") {
    const usesAbs = /return abs\(n\)/.test(normalized);
    const usesCondition = /if n < 0:.*return -n.*return n/.test(normalized);
    return fixedGrade(usesAbs || usesCondition, [
      ["n=-5", 5],
      ["n=3", 3],
      ["n=0", 0],
    ]);
  }
  if (grader === "python-length") {
    const valid = /return len\(items\)/.test(normalized);
    return fixedGrade(valid, [
      ["items=[]", 0],
      ["items=[1, 2, 3]", 3],
    ]);
  }
  const sql = normalizeSql(body);
  if (grader === "sql-active-cats") {
    const valid = /^select name from cats where active = true$/.test(sql);
    return fixedGrade(valid, [["active=true", "SELECT name"]]);
  }
  if (grader === "sql-breed-count") {
    const valid = /^select breed, ?count\(\*\) from cats group by breed$/.test(sql);
    return fixedGrade(valid, [["GROUP BY breed", "breed, COUNT(*)"]]);
  }
  const valid = /^select cats\.name, ?owners\.name from cats join owners on cats\.owner_id = owners\.id$/.test(sql);
  return fixedGrade(valid, [["cats.owner_id=owners.id", "cats.name, owners.name"]]);
}

function normalizeCode(body: string): string {
  return body
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .join(" ")
    .replace(/\s+/g, " ");
}

function normalizeSql(body: string): string {
  return body.trim().replace(/;$/, "").replace(/\s+/g, " ").toLowerCase();
}

function fixedGrade(
  valid: boolean,
  cases: ReadonlyArray<readonly [string, string | number]>,
): { passed: boolean; tests: CodeTestResult[] } {
  const tests = cases.map(([input, expected]) => ({
    input,
    expected,
    actual: valid ? expected : null,
    passed: valid,
  }));
  return { passed: valid, tests };
}
