import { describe, expect, it } from "vitest";
import { message } from "../src/content/messages";

describe("message catalog", () => {
  it("returns a message by its JSON key", () => {
    expect(message("home.install")).toBe("앱 설치");
  });

  it("interpolates named JSON message parameters", () => {
    expect(message("furniture.placed", { item: "침대" })).toBe("침대를 배치했어요.");
  });
});
