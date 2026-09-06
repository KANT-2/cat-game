/**
 * 긴 서버 과제 문구에서 카드에 표시할 한 줄 요약을 만든다.
 *
 * @param value 줄바꿈을 포함할 수 있는 과제 제목 또는 설명이다.
 * @param maximumLength 말줄임표를 포함한 최대 글자 수다.
 * @returns 첫 번째 비어 있지 않은 줄을 정리한 카드용 문구다.
 * @remarks 원본 과제 내용은 변경하지 않으며 상세 화면에서는 전체 문구를 그대로 사용한다.
 */
export function summarizeStudyText(value: string, maximumLength: number): string {
  const firstLine = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine || firstLine.length <= maximumLength) {
    return firstLine ?? "";
  }
  return `${firstLine.slice(0, Math.max(0, maximumLength - 1)).trimEnd()}…`;
}

/**
 * 서버 문제 설명을 상세 화면에서 읽기 좋은 블록으로 정리한다.
 *
 * @param value 빈 줄로 구분된 임무·이야기·요구사항을 포함할 수 있는 원문이다.
 * @returns 상세 제목과 중복되는 첫 임무 블록만 제외하고 나머지 요구사항을 보존한 문구다.
 * @remarks 서버 원문 자체는 바꾸지 않으며 단일 블록인 로컬 문제 문구도 그대로 유지한다.
 */
export function formatStudyDetails(value: string): string {
  const sections = value
    .split(/\r?\n\s*\r?\n/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
  if (sections.length > 1 && sections[0].startsWith("[오늘의 냥이 임무]")) {
    sections.shift();
  }
  return sections.join("\n\n");
}
