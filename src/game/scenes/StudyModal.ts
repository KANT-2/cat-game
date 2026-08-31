import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { QuizAnswerResult, QuizView } from "../../core/GameClient";
import { CanvasButton } from "../components/CanvasButton";
import { textStyle } from "../config";

type StudyModalOptions = { quiz: QuizView; onAnswer: (choiceId: string) => QuizAnswerResult; onClose: () => void };

export class StudyModal extends Container {
  private readonly overlay = new Graphics();
  private readonly panel = new Container();
  private readonly feedback: Text;
  private completed: boolean;

  constructor(options: StudyModalOptions) {
    super();
    this.completed = options.quiz.completed;
    this.overlay.eventMode = "static";
    this.addChild(this.overlay, this.panel);
    this.buildFrame();
    this.buildSidebar();
    this.buildLesson(options);
    this.feedback = new Text({ text: "", style: textStyle(17, 0x55734d, "700") });
    this.feedback.anchor.set(0.5);
    this.feedback.position.set(215, 255);
    this.panel.addChild(this.feedback);
    const close = new CanvasButton({
      label: message("study.close"),
      width: 190,
      height: 52,
      color: 0xc98a4d,
      textColor: 0xffffff,
      onPress: options.onClose,
    });
    close.position.set(-95, 210);
    this.panel.addChild(close);
  }

  layout(width: number, height: number): void {
    this.overlay.clear().rect(0, 0, width, height).fill({ color: 0x3c281c, alpha: 0.58 });
    const scale = Math.min(width / 1450, height / 820, 1);
    this.panel.scale.set(scale);
    this.panel.position.set(width / 2, height / 2);
  }

  private buildFrame(): void {
    this.panel.addChild(
      new Graphics()
        .roundRect(-696, -376, 1392, 752, 34)
        .fill(0xf8e5c6)
        .stroke({ color: 0x69432d, width: 6 })
        .roundRect(-675, -355, 1350, 710, 25)
        .fill(0xfff8e9)
        .stroke({ color: 0xd8ae7f, width: 2 }),
    );
    const heading = new Text({ text: message("study.screenTitle"), style: textStyle(32, 0x3d2418, "800") });
    heading.position.set(-640, -334);
    this.panel.addChild(heading);
  }

  private buildSidebar(): void {
    this.panel.addChild(
      new Graphics().roundRect(-650, -270, 270, 548, 24).fill(0xf4dfbf).stroke({ color: 0xc89662, width: 3 }),
    );
    const title = new Text({ text: message("study.courseTitle"), style: textStyle(24, 0x3d2b22, "800") });
    title.anchor.set(0.5);
    title.position.set(-515, -225);
    this.panel.addChild(title);
    (
      [
        "study.lessonOutput",
        "study.lessonVariables",
        "study.lessonArithmetic",
        "study.lessonStrings",
        "study.lessonInput",
      ] as const
    ).forEach((labelId, index) => {
      const active = index === 0;
      const row = new Graphics()
        .roundRect(-630, -180 + index * 74, 230, 58, 14)
        .fill(active ? 0xffc76d : 0xfff4e2)
        .stroke({ color: active ? 0xd88931 : 0xdfc09c, width: 2 });
      const rowText = new Text({ text: message(labelId), style: textStyle(17, 0x4b3021, active ? "800" : "600") });
      rowText.position.set(-610, -162 + index * 74);
      this.panel.addChild(row, rowText);
    });
  }

  private buildLesson(options: StudyModalOptions): void {
    this.panel.addChild(
      new Graphics().roundRect(-345, -270, 1000, 548, 24).fill(0xfffbf1).stroke({ color: 0xc89662, width: 3 }),
    );
    const title = new Text({
      text: message("study.lessonTitle", { title: message(options.quiz.titleMessage) }),
      style: textStyle(27, 0x3d2418, "800"),
    });
    title.position.set(-310, -235);
    const prompt = message(options.quiz.promptMessage);
    const [questionText, ...codeLines] = prompt.split("\n");
    const question = new Text({ text: questionText, style: textStyle(19, 0x3d2b22, "700") });
    question.position.set(-310, -170);
    const codeBox = new Graphics().roundRect(-310, -125, 610, 105, 12).fill(0x252a33);
    const code = new Text({
      text: codeLines.join("\n").trim(),
      style: { ...textStyle(19, 0xdce899, "600"), fontFamily: "Consolas, monospace", lineHeight: 29 },
    });
    code.position.set(-285, -108);
    this.panel.addChild(title, question, codeBox, code);
    const answerTitle = new Text({ text: message("study.choicesTitle"), style: textStyle(19, 0x3d2b22, "800") });
    answerTitle.position.set(-310, 8);
    this.panel.addChild(answerTitle);
    options.quiz.choices.forEach((choice, index) => {
      const button = new CanvasButton({
        label: `${String.fromCharCode(65 + index)}   ${message(choice.labelMessage)}`,
        width: 610,
        height: 52,
        color: 0xfff0d8,
        borderColor: 0xd4ad82,
        onPress: () => this.answer(options, choice.id),
      });
      button.position.set(-310, 42 + index * 62);
      this.panel.addChild(button);
    });
    this.panel.addChild(this.drawGuideCat());
  }

  private answer(options: StudyModalOptions, choiceId: string): void {
    const result = options.onAnswer(choiceId);
    if (!result.ok) {
      this.feedback.style.fill = 0xa44f44;
      this.feedback.text = message("study.answerFailed");
      return;
    }
    this.feedback.style.fill = result.correct ? 0x55734d : 0xa44f44;
    if (!result.correct) {
      this.feedback.text = message(result.feedbackMessage);
      return;
    }
    if (!this.completed && result.firstCompletion) {
      this.completed = true;
      this.feedback.text = message("study.rewardAwarded", {
        feedback: message(result.feedbackMessage),
        amount: result.coinsAwarded,
      });
      return;
    }
    this.completed = true;
    this.feedback.text = message("study.rewardAlreadyClaimed", { feedback: message(result.feedbackMessage) });
  }

  private drawGuideCat(): Container {
    const guide = new Container();
    guide.position.set(480, 65);
    guide.addChild(
      new Graphics()
        .ellipse(0, 105, 72, 19)
        .fill({ color: 0x5a3b2c, alpha: 0.15 })
        .ellipse(0, 56, 58, 70)
        .fill(0xe48b3c)
        .stroke({ color: 0x573727, width: 4 })
        .circle(0, -10, 61)
        .fill(0xef9c4b)
        .stroke({ color: 0x573727, width: 4 })
        .poly([-48, -45, -38, -94, -8, -57, 25, -58, 45, -94, 52, -40])
        .fill(0xef9c4b)
        .stroke({ color: 0x573727, width: 4 })
        .circle(-20, -15, 5)
        .circle(20, -15, 5)
        .fill(0x3d2b22)
        .circle(0, 3, 5)
        .fill(0x6a3b2c),
    );
    const bubble = new Graphics()
      .roundRect(-115, -185, 230, 68, 22)
      .fill(0xffffff)
      .stroke({ color: 0x68442f, width: 3 })
      .poly([-12, -118, 4, -98, 18, -118])
      .fill(0xffffff)
      .stroke({ color: 0x68442f, width: 3 });
    const bubbleText = new Text({ text: message("study.guideBubble"), style: textStyle(17, 0x3d2b22, "700") });
    bubbleText.anchor.set(0.5);
    bubbleText.position.set(0, -151);
    guide.addChild(bubble, bubbleText);
    return guide;
  }
}
