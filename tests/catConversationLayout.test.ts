import { describe, expect, it } from "vitest";
import { clampConversationText } from "../src/game/components/CatConversationModal";

describe("cat conversation layout", () => {
  it("normalizes and clamps long AI replies to the dialogue bubble budget", () => {
    const value = `  ${"긴 답변 ".repeat(80)}  `;
    const result = clampConversationText(value);

    expect(result.length).toBeLessThanOrEqual(190);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("  ");
  });
});
