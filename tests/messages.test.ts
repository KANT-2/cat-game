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

  it("describes both profile image integration states", () => {
    expect(message("settings.profileImageDescription")).toBe("학생관리시스템에서 등록된 개인 이미지 사용");
    expect(message("settings.profileImageAvailable")).toBe("연동 완료");
    expect(message("settings.profileImageUnavailable")).toBe("연동 미완료");
  });

  it("warns before clearing one cat's memories", () => {
    expect(message("cat.conversation.clearMemory")).toBe("기억 초기화");
    expect(message("cat.conversation.clearMemoryConfirmTitle", { name: "포근이" })).toBe(
      "포근이와의 기억을 초기화할까요?",
    );
    expect(message("cat.conversation.clearMemoryConfirmDescription")).toContain("복구할 수 없습니다");
  });
});
