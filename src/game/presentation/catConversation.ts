import type { MessageId } from "../../content/messages";
import type { CatConversationTopic } from "../../domain/catConversation";
import type { CatVariant } from "../../domain/cats";
import type { CatAction } from "../entities/CatAnimations";

export type CatConversationProfile = {
  nameMessage: MessageId;
  titleMessage: MessageId;
  descriptionMessage: MessageId;
  accentColor: number;
};

type CatReplyDefinition = {
  messages: readonly [MessageId, MessageId];
  action: CatAction;
};

const profiles: Record<CatVariant, CatConversationProfile> = {
  fluffy: {
    nameMessage: "cat.fluffyName",
    titleMessage: "cat.conversation.fluffyTitle",
    descriptionMessage: "cat.conversation.fluffyDescription",
    accentColor: 0xc98d66,
  },
  ink: {
    nameMessage: "cat.inkName",
    titleMessage: "cat.conversation.inkTitle",
    descriptionMessage: "cat.conversation.inkDescription",
    accentColor: 0x6c7183,
  },
  siamese: {
    nameMessage: "cat.siameseName",
    titleMessage: "cat.conversation.siameseTitle",
    descriptionMessage: "cat.conversation.siameseDescription",
    accentColor: 0xae8168,
  },
  tabby: {
    nameMessage: "cat.tabbyName",
    titleMessage: "cat.conversation.tabbyTitle",
    descriptionMessage: "cat.conversation.tabbyDescription",
    accentColor: 0xda9544,
  },
  silver: {
    nameMessage: "cat.silverName",
    titleMessage: "cat.conversation.silverTitle",
    descriptionMessage: "cat.conversation.silverDescription",
    accentColor: 0x9a9da8,
  },
  calico: {
    nameMessage: "cat.calicoName",
    titleMessage: "cat.conversation.calicoTitle",
    descriptionMessage: "cat.conversation.calicoDescription",
    accentColor: 0xd68b55,
  },
  tuxedo: {
    nameMessage: "cat.tuxedoName",
    titleMessage: "cat.conversation.tuxedoTitle",
    descriptionMessage: "cat.conversation.tuxedoDescription",
    accentColor: 0x5e6470,
  },
  fold: {
    nameMessage: "cat.foldName",
    titleMessage: "cat.conversation.foldTitle",
    descriptionMessage: "cat.conversation.foldDescription",
    accentColor: 0xb6a99b,
  },
};

const replies: Record<CatVariant, Record<CatConversationTopic, CatReplyDefinition>> = {
  fluffy: {
    greeting: { messages: ["cat.conversation.fluffyGreeting1", "cat.conversation.fluffyGreeting2"], action: "groom" },
    feelings: { messages: ["cat.conversation.fluffyFeelings1", "cat.conversation.fluffyFeelings2"], action: "idle" },
    play: { messages: ["cat.conversation.fluffyPlay1", "cat.conversation.fluffyPlay2"], action: "scratch" },
    study: { messages: ["cat.conversation.fluffyStudy1", "cat.conversation.fluffyStudy2"], action: "groom" },
  },
  ink: {
    greeting: { messages: ["cat.conversation.inkGreeting1", "cat.conversation.inkGreeting2"], action: "idle" },
    feelings: { messages: ["cat.conversation.inkFeelings1", "cat.conversation.inkFeelings2"], action: "surprise" },
    play: { messages: ["cat.conversation.inkPlay1", "cat.conversation.inkPlay2"], action: "attack" },
    study: { messages: ["cat.conversation.inkStudy1", "cat.conversation.inkStudy2"], action: "scratch" },
  },
  siamese: {
    greeting: {
      messages: ["cat.conversation.siameseGreeting1", "cat.conversation.siameseGreeting2"],
      action: "surprise",
    },
    feelings: { messages: ["cat.conversation.siameseFeelings1", "cat.conversation.siameseFeelings2"], action: "groom" },
    play: { messages: ["cat.conversation.siamesePlay1", "cat.conversation.siamesePlay2"], action: "jump" },
    study: { messages: ["cat.conversation.siameseStudy1", "cat.conversation.siameseStudy2"], action: "scratch" },
  },
  tabby: {
    greeting: { messages: ["cat.conversation.tabbyGreeting1", "cat.conversation.tabbyGreeting2"], action: "jump" },
    feelings: { messages: ["cat.conversation.tabbyFeelings1", "cat.conversation.tabbyFeelings2"], action: "groom" },
    play: { messages: ["cat.conversation.tabbyPlay1", "cat.conversation.tabbyPlay2"], action: "attack" },
    study: { messages: ["cat.conversation.tabbyStudy1", "cat.conversation.tabbyStudy2"], action: "jump" },
  },
  silver: {
    greeting: { messages: ["cat.conversation.silverGreeting1", "cat.conversation.silverGreeting2"], action: "idle" },
    feelings: { messages: ["cat.conversation.silverFeelings1", "cat.conversation.silverFeelings2"], action: "groom" },
    play: { messages: ["cat.conversation.silverPlay1", "cat.conversation.silverPlay2"], action: "scratch" },
    study: { messages: ["cat.conversation.silverStudy1", "cat.conversation.silverStudy2"], action: "surprise" },
  },
  calico: {
    greeting: { messages: ["cat.conversation.calicoGreeting1", "cat.conversation.calicoGreeting2"], action: "jump" },
    feelings: { messages: ["cat.conversation.calicoFeelings1", "cat.conversation.calicoFeelings2"], action: "groom" },
    play: { messages: ["cat.conversation.calicoPlay1", "cat.conversation.calicoPlay2"], action: "attack" },
    study: { messages: ["cat.conversation.calicoStudy1", "cat.conversation.calicoStudy2"], action: "scratch" },
  },
  tuxedo: {
    greeting: { messages: ["cat.conversation.tuxedoGreeting1", "cat.conversation.tuxedoGreeting2"], action: "idle" },
    feelings: {
      messages: ["cat.conversation.tuxedoFeelings1", "cat.conversation.tuxedoFeelings2"],
      action: "surprise",
    },
    play: { messages: ["cat.conversation.tuxedoPlay1", "cat.conversation.tuxedoPlay2"], action: "run" },
    study: { messages: ["cat.conversation.tuxedoStudy1", "cat.conversation.tuxedoStudy2"], action: "scratch" },
  },
  fold: {
    greeting: { messages: ["cat.conversation.foldGreeting1", "cat.conversation.foldGreeting2"], action: "groom" },
    feelings: { messages: ["cat.conversation.foldFeelings1", "cat.conversation.foldFeelings2"], action: "idle" },
    play: { messages: ["cat.conversation.foldPlay1", "cat.conversation.foldPlay2"], action: "jump" },
    study: { messages: ["cat.conversation.foldStudy1", "cat.conversation.foldStudy2"], action: "groom" },
  },
};

export const catConversationTopicMessages: Record<CatConversationTopic, MessageId> = {
  greeting: "cat.conversation.topicGreeting",
  feelings: "cat.conversation.topicFeelings",
  play: "cat.conversation.topicPlay",
  study: "cat.conversation.topicStudy",
};

export function getCatConversationProfile(variant: CatVariant): CatConversationProfile {
  return profiles[variant];
}

/** 누적 대화 횟수에 따라 같은 주제에서도 두 문장을 번갈아 선택한다. */
export function resolveCatConversationReply(
  variant: CatVariant,
  topic: CatConversationTopic,
  memoryCount: number,
): { messageId: MessageId; action: CatAction } {
  const reply = replies[variant][topic];
  const index = Math.max(0, memoryCount - 1) % reply.messages.length;
  return { messageId: reply.messages[index], action: reply.action };
}
