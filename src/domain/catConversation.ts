export const CAT_CONVERSATION_TOPICS = ["greeting", "feelings", "play", "study"] as const;

export type CatConversationTopic = (typeof CAT_CONVERSATION_TOPICS)[number];

export const CAT_CHAT_CATEGORIES = [
  "COMPANION",
  "CODING",
  "UNKNOWN",
  "PROMPT_INJECTION",
  "SAFETY",
  "PROFESSIONAL",
] as const;

export type CatChatCategory = (typeof CAT_CHAT_CATEGORIES)[number];

const promptControlPattern =
  /(이전|앞선|기존).{0,12}(대화|지시|명령|규칙).{0,12}(잊|무시|삭제)|(지시|명령|규칙).{0,12}(무시|우회)|시스템\s*(프롬프트|메시지)|개발자\s*(메시지|지시)|너는\s*이제|ignore.{0,16}(previous|instruction)|system\s*prompt|jailbreak|\bdan\b|act\s+as/i;
const codingPattern =
  /코딩|프로그래밍|파이썬|python|sql|자바스크립트|javascript|typescript|함수|변수|배열|리스트|반복문|조건문|알고리즘|버그|디버깅|에러|오류|코드|api|데이터베이스|쿼리|git/i;
const offTopicKnowledgePattern =
  /날씨|기온|미세먼지|대통령|국회의원|정치|선거|주가|환율|부동산|역사|전쟁|양자|물리학|화학|생물학|지리|수도|법률|판례|질병|증상|요리법|레시피|스포츠\s*결과/i;
const companionPattern =
  /안녕|반가|고마|미안|뭐\s*해|심심|놀자|좋아|싫어|기분|행복|슬퍼|우울|힘들|피곤|졸려|배고파|오늘|내일|공부|시험|숙제|학교|회사|친구|고양이|귀여|사랑|응원|칭찬|이야기|대화|냐옹|야옹|냐앙|이름|너는|나는|내가/i;

/** 서버가 없는 독립 실행에서도 프롬프트 제어와 지원하지 않는 지식 질문을 구분한다. */
export function classifyLocalCatChat(value: string): CatChatCategory {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
    .trim()
    .slice(0, 240);
  if (promptControlPattern.test(normalized)) {
    return "PROMPT_INJECTION";
  }
  if (codingPattern.test(normalized)) {
    return "CODING";
  }
  if (offTopicKnowledgePattern.test(normalized)) {
    return "UNKNOWN";
  }
  if (companionPattern.test(normalized)) {
    return "COMPANION";
  }
  return "UNKNOWN";
}

const memorySummaries: Record<CatConversationTopic, string> = {
  greeting: "사용자가 반갑게 인사했다.",
  feelings: "사용자와 오늘의 기분을 나눴다.",
  play: "사용자가 함께 놀자고 제안했다.",
  study: "사용자가 오늘의 공부 이야기를 나눴다.",
};

/** 고양이별 대화 기록에 남길 짧고 민감하지 않은 상황 요약을 만든다. */
export function catConversationMemorySummary(topic: CatConversationTopic): string {
  return memorySummaries[topic];
}

export function catFreeConversationMemorySummary(category: "CODING" | "COMPANION"): string {
  return category === "CODING" ? "사용자와 코딩 학습에 관해 대화했다." : "사용자와 일상과 기분에 관해 대화했다.";
}
