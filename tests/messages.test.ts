import { describe, expect, it } from "vitest";
import { message } from "../src/content/messages";

describe("message catalog", () => {
  it("returns a message by its JSON key", () => {
    expect(message("home.install")).toBe("앱 설치");
  });

  it("interpolates named JSON message parameters", () => {
    expect(message("furniture.placed", { item: "침대" })).toBe("침대를 배치했어요.");
  });

  it("explains a temporarily lagging gacha catalog", () => {
    expect(message("gacha.catalogUpdating")).toBe("새 보상 목록을 준비하고 있어요. 잠시 뒤 다시 뽑아 주세요.");
  });

  it("keeps the game-name braces as literal text", () => {
    expect(message("pwa.installed")).toBe("{ 냥 }이 설치되었어요.");
  });
});
