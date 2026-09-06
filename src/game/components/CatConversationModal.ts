import { Container, Graphics, Sprite, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { Awaitable, CatConversationResult, CatFreeConversationResult, GameText } from "../../core/GameClient";
import { CAT_CONVERSATION_TOPICS, type CatConversationTopic } from "../../domain/catConversation";
import type { CatVariant } from "../../domain/cats";
import { textStyle } from "../config";
import type { CatAnimationSet } from "../entities/CatAnimations";
import type { TextInputBridge, TextInputBridgeFactory } from "../ports/TextInputBridge";
import {
  catConversationTopicMessages,
  getCatConversationProfile,
  resolveCatConversationReply,
} from "../presentation/catConversation";
import { CanvasButton } from "./CanvasButton";
import { createCozyPanel, createTitleOrnament } from "./CozyGameUi";
import { layoutToFillViewport } from "./fullscreenLayout";

type CatConversationModalOptions = {
  variant: CatVariant;
  animations: CatAnimationSet;
  memoryCount: number;
  onTalk: (topic: CatConversationTopic) => Awaitable<CatConversationResult>;
  onFreeTalk: (userMessage: string) => Awaitable<CatFreeConversationResult>;
  textInputFactory: TextInputBridgeFactory;
  onReaction: (action: ReturnType<typeof resolveCatConversationReply>["action"]) => void;
  onClose: () => void;
};

/** 고양이별 페르소나와 안전한 상황 선택지를 보여 주는 전체 Canvas 대화 모달이다. */
export class CatConversationModal extends Container {
  private readonly backdrop = new Graphics();
  private readonly content = new Container();
  private memoryCount: number;
  private replyText: string | null = null;
  private pending = false;
  private draft = "";
  private readonly inputBridge: TextInputBridge;

  constructor(private readonly options: CatConversationModalOptions) {
    super({ label: `cat-conversation:${options.variant}` });
    this.memoryCount = options.memoryCount;
    this.inputBridge = options.textInputFactory.create({
      initialValue: "",
      maxLength: 240,
      ariaLabel: message("cat.conversation.inputAria"),
      onChange: (value) => {
        this.draft = value;
        this.render();
      },
      onSubmit: () => void this.submitFreeTalk(),
    });
    this.backdrop.eventMode = "static";
    this.addChild(this.backdrop, this.content);
    this.render();
  }

  layout(width: number, height: number): void {
    this.backdrop.clear().rect(0, 0, width, height).fill({ color: 0x251813, alpha: 0.66 });
    layoutToFillViewport(this.content, width, height);
  }

  disposeInput(): void {
    this.inputBridge.destroy();
  }

  private render(): void {
    this.content.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    const profile = getCatConversationProfile(this.options.variant);
    const name = message(profile.nameMessage);
    const panel = createCozyPanel(190, 90, 1220, 720, {
      fill: 0xfff4dc,
      border: profile.accentColor,
      radius: 36,
      shadowAlpha: 0.42,
    });
    const title = new Text({
      text: message("cat.conversation.title", { name }),
      style: textStyle(36, 0x482b20, "800"),
    });
    title.position.set(560, 132);
    const personaTitle = new Text({
      text: message(profile.titleMessage),
      style: textStyle(19, profile.accentColor, "800"),
    });
    personaTitle.position.set(562, 185);
    const personaDescription = new Text({
      text: message(profile.descriptionMessage),
      style: {
        ...textStyle(16, 0x725344, "600"),
        wordWrap: true,
        wordWrapWidth: 700,
        lineHeight: 25,
      },
    });
    personaDescription.position.set(562, 220);
    const memory = new Text({
      text: message("cat.conversation.memoryCount", { count: this.memoryCount }),
      style: textStyle(14, 0x86614d, "700"),
    });
    memory.position.set(562, 278);
    const ornament = createTitleOrnament(562, 306, 210);
    this.content.addChild(panel, title, personaTitle, personaDescription, memory, ornament);
    this.renderPortrait(profile.accentColor);
    this.renderDialogue(name, profile.accentColor);
    this.renderActions();
  }

  private renderPortrait(accentColor: number): void {
    const portraitPanel = new Graphics()
      .roundRect(245, 150, 270, 390, 34)
      .fill(0xffe8c4)
      .stroke({ color: accentColor, width: 4 })
      .ellipse(380, 480, 98, 25)
      .fill({ color: 0x6a4533, alpha: 0.16 });
    const texture = this.options.animations.idle.textures[0];
    const portrait = new Sprite(texture);
    portrait.anchor.set(0.5);
    const scale = Math.min(310 / texture.width, 310 / texture.height);
    portrait.scale.set(scale);
    portrait.position.set(380, 350);
    this.content.addChild(portraitPanel, portrait);
  }

  private renderDialogue(name: string, accentColor: number): void {
    const bubble = new Graphics()
      .poly([570, 397, 535, 419, 570, 443])
      .fill({ color: 0x3f281c, alpha: 0.2 })
      .roundRect(568, 344, 785, 145, 30)
      .fill({ color: 0x3f281c, alpha: 0.2 })
      .poly([564, 389, 526, 413, 564, 439])
      .fill(0xfffff8)
      .stroke({ color: accentColor, width: 4, join: "round" })
      .roundRect(560, 335, 785, 145, 30)
      .fill(0xfffff8)
      .stroke({ color: accentColor, width: 4 })
      .roundRect(570, 345, 765, 34, 19)
      .fill({ color: 0xffffff, alpha: 0.5 });
    const nameText = new Text({ text: name, style: textStyle(15, 0xffffff, "800") });
    nameText.anchor.set(0.5);
    const namePlateWidth = Math.max(92, nameText.width + 38);
    const namePlate = new Graphics()
      .roundRect(598, 318, namePlateWidth, 36, 18)
      .fill(accentColor)
      .stroke({ color: 0xffffff, width: 2, alpha: 0.75 });
    nameText.position.set(598 + namePlateWidth / 2, 336);
    const paw = new Graphics()
      .ellipse(1300, 369, 12, 10)
      .circle(1281, 355, 6)
      .circle(1295, 349, 6)
      .circle(1309, 352, 6)
      .fill({ color: accentColor, alpha: 0.22 });
    const text = new Text({
      text: this.pending ? message("cat.conversation.pending") : (this.replyText ?? message("cat.conversation.prompt")),
      style: {
        ...textStyle(this.replyText ? 22 : 20, 0x482b20, this.replyText ? "700" : "600"),
        wordWrap: true,
        wordWrapWidth: 665,
        lineHeight: 32,
        align: "left",
      },
    });
    text.anchor.set(0, 0.5);
    text.position.set(610, 412);
    this.content.addChild(bubble, namePlate, nameText, paw, text);
  }

  private renderActions(): void {
    CAT_CONVERSATION_TOPICS.forEach((topic, index) => {
      const button = new CanvasButton({
        label: message(catConversationTopicMessages[topic]),
        width: 365,
        height: 60,
        color: index % 2 === 0 ? 0xffd38a : 0xf0cda2,
        fontSize: 16,
        disabled: this.pending,
        onPress: () => void this.chooseTopic(topic),
      });
      button.position.set(570 + (index % 2) * 390, 505 + Math.floor(index / 2) * 66);
      this.content.addChild(button);
    });
    const inputBox = new Graphics()
      .roundRect(570, 644, 610, 62, 20)
      .fill(0xfffffb)
      .stroke({ color: 0xc99a6c, width: 3 });
    inputBox.eventMode = "static";
    inputBox.cursor = "text";
    inputBox.on("pointertap", () => this.inputBridge.focus());
    const inputValue = this.draft.trim() ? this.draft.slice(-72) : message("cat.conversation.freePlaceholder");
    const inputText = new Text({
      text: inputValue,
      style: {
        ...textStyle(16, this.draft.trim() ? 0x482b20 : 0xa48775, this.draft.trim() ? "600" : "500"),
        wordWrap: true,
        wordWrapWidth: 555,
        lineHeight: 21,
      },
    });
    inputText.position.set(592, 655);
    const send = new CanvasButton({
      label: message("cat.conversation.send"),
      width: 145,
      height: 62,
      color: 0xe9a14b,
      fontSize: 16,
      disabled: this.pending || !this.draft.trim(),
      onPress: () => void this.submitFreeTalk(),
    });
    send.position.set(1200, 644);
    const close = new CanvasButton({
      label: message("cat.conversation.close"),
      width: 270,
      height: 54,
      color: 0xd7b38c,
      fontSize: 15,
      disabled: this.pending,
      onPress: this.options.onClose,
    });
    close.position.set(245, 682);
    this.content.addChild(inputBox, inputText, send, close);
  }

  private async chooseTopic(topic: CatConversationTopic): Promise<void> {
    if (this.pending) {
      return;
    }
    this.pending = true;
    this.render();
    const result = await this.options.onTalk(topic);
    this.pending = false;
    if (!result.ok) {
      this.replyText = message("cat.conversation.unavailable");
      this.render();
      return;
    }
    this.memoryCount = result.memoryCount;
    const reply = resolveCatConversationReply(this.options.variant, topic, result.memoryCount);
    this.replyText = message(reply.messageId);
    this.options.onReaction(reply.action);
    this.render();
  }

  private async submitFreeTalk(): Promise<void> {
    const userMessage = this.draft.trim();
    if (this.pending || !userMessage) {
      return;
    }
    this.pending = true;
    this.render();
    const result = await this.options.onFreeTalk(userMessage);
    this.pending = false;
    if (!result.ok) {
      this.replyText = message("cat.conversation.unavailable");
      this.render();
      return;
    }
    this.memoryCount = result.memoryCount;
    this.replyText = resolveGameText(result.reply);
    this.draft = "";
    this.inputBridge.setValue("");
    if (result.category === "CODING") {
      this.options.onReaction("scratch");
    } else if (result.category === "COMPANION") {
      this.options.onReaction("groom");
    } else {
      this.options.onReaction("surprise");
    }
    this.render();
  }
}

function resolveGameText(value: GameText): string {
  return "text" in value ? value.text : message(value.messageId);
}
