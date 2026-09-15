import type { Text } from "pixi.js";
import { describe, expect, it } from "vitest";
import { fitWrappedTextHeight } from "../src/game/components/CanvasButton";
import { formatStudyDetails } from "../src/game/presentation/studyPresentation";
import { quizChoiceLayout } from "../src/game/scenes/StudyModal";

describe("long multiple-choice layout", () => {
  it("keeps the full wrapped scenario, question and four choices inside the page", () => {
    const value = [
      "[도와주세요!] 나비가 츄르와 우유를 사기 전에 가진 돈과 각 상품의 가격을 차근차근 비교하고 있어요. ".repeat(8),
      "[문제] 여러 조건을 모두 확인해 구매할 수 있는지 판단하세요.",
      "[질문] 이 문제를 해결하는 데 가장 알맞은 방법을 하나 골라 주세요.",
    ].join("\n\n");
    const displayed = formatStudyDetails(value);
    const layout = quizChoiceLayout(155 + 245, 4);

    expect(displayed).toBe(value.replace(/ +\n/g, "\n").trim());
    expect(displayed).toContain("[질문]");
    expect(layout.height).toBeGreaterThanOrEqual(44);
    expect(layout.startY).toBeGreaterThan(155 + 245);
    expect(layout.bottom).toBeLessThanOrEqual(825);
  });

  it("fits long Korean and SQL choice labels inside every button", () => {
    const koreanLabel = fakeWrappedText(8);
    const sqlLabel = fakeWrappedText(6);

    fitWrappedTextHeight(koreanLabel, 56, 11, 16, 5);
    fitWrappedTextHeight(sqlLabel, 56, 11, 16, 5);

    expect(koreanLabel.height).toBeLessThanOrEqual(56);
    expect(sqlLabel.height).toBeLessThanOrEqual(56);
  });

  it("fits the full code prompt and revealed hints within their panel regions", () => {
    const prompt = fakeWrappedText(20);
    const hints = fakeWrappedText(15);

    fitWrappedTextHeight(prompt, 155, 12, 16, 7);
    fitWrappedTextHeight(hints, 165, 11, 16, 9);

    expect(prompt.height).toBeLessThanOrEqual(155);
    expect(hints.height).toBeLessThanOrEqual(165);
  });
});

function fakeWrappedText(lineCount: number): Text {
  let scale = 1;
  const style = { fontSize: 16, lineHeight: 21 };
  return {
    style,
    scale: { set: (value: number) => (scale = value) },
    get height() {
      return lineCount * Number(style.lineHeight) * scale;
    },
  } as unknown as Text;
}
