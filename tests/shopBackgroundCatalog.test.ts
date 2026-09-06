import { describe, expect, it } from "vitest";
import { message } from "../src/content/messages";
import { type ShopItemId, shopItemDefinitions } from "../src/domain/shop";
import { shopItemNameMessages } from "../src/game/shopItemPresentation";

describe("shop background catalog", () => {
  it("exposes every selectable place as a background without wallpaper wording", () => {
    const backgroundIds = (Object.keys(shopItemDefinitions) as ShopItemId[]).filter(
      (itemId) => shopItemDefinitions[itemId].kind === "wallpaper",
    );

    expect(backgroundIds).toHaveLength(16);
    for (const itemId of backgroundIds) {
      expect(message(shopItemNameMessages[itemId])).not.toContain("벽지");
    }
  });
});
