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
