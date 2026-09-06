import { describe, expect, it } from "vitest";
import { CAT_CONVERSATION_TOPICS } from "../src/domain/catConversation";
import { catVariants } from "../src/domain/cats";
import { getCatConversationProfile, resolveCatConversationReply } from "../src/game/presentation/catConversation";

describe("cat conversation presentation", () => {
  it("defines a complete and distinct persona for every cat", () => {
    const profiles = catVariants.map(getCatConversationProfile);

    expect(new Set(profiles.map((profile) => profile.nameMessage)).size).toBe(catVariants.length);
    expect(new Set(profiles.map((profile) => profile.descriptionMessage)).size).toBe(catVariants.length);
  });

  it("provides alternating replies and a reaction for every topic", () => {
    for (const variant of catVariants) {
      for (const topic of CAT_CONVERSATION_TOPICS) {
        const first = resolveCatConversationReply(variant, topic, 1);
        const second = resolveCatConversationReply(variant, topic, 2);
        expect(first.messageId).not.toBe(second.messageId);
        expect(first.action).toBeTruthy();
      }
    }
  });
});
