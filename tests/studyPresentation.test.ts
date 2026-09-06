import { describe, expect, it } from "vitest";
import { formatStudyDetails, summarizeStudyText } from "../src/game/presentation/studyPresentation";

describe("study presentation", () => {
  it("uses the first meaningful line for dashboard cards", () => {
    expect(summarizeStudyText("\n  첫 번째 요약  \n상세 설명", 30)).toBe("첫 번째 요약");
  });

  it("truncates long server text without exceeding the card limit", () => {
    const summary = summarizeStudyText("고양이와 함께 아주 긴 파이썬 문제를 차근차근 해결해요", 14);

    expect(summary.length).toBeLessThanOrEqual(14);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("removes the repeated mission heading while preserving every detail section", () => {
    expect(
      formatStudyDetails(
        "[오늘의 냥이 임무] 학생 조회\n\n[고양이 이야기] 나비가 기다려요.\n\n[도와주세요!] SQL을 작성하세요.",
      ),
    ).toBe("[고양이 이야기] 나비가 기다려요.\n\n[도와주세요!] SQL을 작성하세요.");
  });
});
