import { describe, expect, it } from "vitest";
import { drawGachaRewards, gachaRewardDefinitions } from "../src/domain/gacha";
import { shopItemDefinitions } from "../src/domain/shop";
import { learningCardSummary, learningDescription } from "../src/services/learningDescription";

describe("catalog gacha pool", () => {
  it("covers every furniture product, with the existing total and cat probability", () => {
    const furniture = Object.entries(shopItemDefinitions)
      .filter(([, item]) => item.kind === "furniture")
      .map(([id]) => id);
    expect(
      gachaRewardDefinitions
        .filter((r) => r.kind === "furniture")
        .map((r) => r.id)
        .sort(),
    ).toEqual(furniture.sort());
    expect(new Set(gachaRewardDefinitions.map((r) => r.id)).size).toBe(gachaRewardDefinitions.length);
    expect(gachaRewardDefinitions.reduce((sum, r) => sum + r.weight, 0)).toBeCloseTo(1);
    expect(gachaRewardDefinitions[0]).toMatchObject({ id: "cat.ink", weight: 0.05 });
  });
  it("makes every catalog reward reachable in its weighted interval", () => {
    let boundary = 0;
    for (const reward of gachaRewardDefinitions) {
      const roll = boundary + reward.weight / 2;
      expect(drawGachaRewards(1, () => roll)).toEqual([reward]);
      boundary += reward.weight;
    }
  });
});

describe("learning description", () => {
  it("normalizes legacy headings and preserves problem instructions", () => {
    expect(learningDescription("[고양이 이야기] 부탁\n\n[문제] SELECT 1")).toBe(
      "[도와주세요!] 부탁\n\n[문제] SELECT 1",
    );
    expect(learningDescription("[고양이 이야기] 부탁\n\n[도와주세요!] 두 수를 더하세요.")).toBe(
      "[도와주세요!] 부탁\n\n[문제] 두 수를 더하세요.",
    );
    const current = "[도와주세요!] 우유 주문\n\n[문제] SELECT 1";
    expect(learningDescription(current)).toBe(current);
  });

  it("uses the task problem on cards without a section prefix", () => {
    const description =
      "[오늘의 냥이 임무] 학생 조회\n\n[도와주세요!] 나비가 우유 주문을 정리하고 있어요.\n\n[문제] 학생을 조회하세요.";
    expect(learningCardSummary(description)).toBe("학생을 조회하세요.");
    expect(learningCardSummary(description)).not.toContain("[문제]");
  });
});
