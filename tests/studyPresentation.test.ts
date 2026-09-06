import { describe, expect, it } from "vitest";
import { summarizeStudyText } from "../src/game/presentation/studyPresentation";

describe("study presentation", () => {
  it("uses the first meaningful line for dashboard cards", () => {
    expect(summarizeStudyText("\n  첫 번째 요약  \n상세 설명", 30)).toBe("첫 번째 요약");
  });

  it("truncates long server text without exceeding the card limit", () => {
    const summary = summarizeStudyText("고양이와 함께 아주 긴 파이썬 문제를 차근차근 해결해요", 14);

    expect(summary.length).toBeLessThanOrEqual(14);
    expect(summary.endsWith("…")).toBe(true);
  });
});
