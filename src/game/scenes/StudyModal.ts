import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { QuizAnswerResult, QuizView } from "../../core/GameClient";
import { CanvasButton } from "../components/CanvasButton";
import { textStyle } from "../config";

type StudyModalOptions = {
  quiz: QuizView;
  onAnswer: (choiceId: string) => QuizAnswerResult;
  onClose: () => void;
};

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

    this.panel.addChild(
      new Graphics().roundRect(-340, -245, 680, 490, 30).fill(0xfff8e8).stroke({ color: 0x68442f, width: 6 }),
    );
    const title = new Text({ text: message(options.quiz.titleMessage), style: textStyle(28, 0x3d2b22, "800") });
    title.anchor.set(0.5);
    title.position.set(0, -190);
    this.panel.addChild(title);

    const question = new Text({
      text: message(options.quiz.promptMessage),
      style: { ...textStyle(21), align: "center", lineHeight: 31 },
    });
    question.anchor.set(0.5);
    question.position.set(0, -75);
    this.panel.addChild(question);

    this.feedback = new Text({ text: "", style: textStyle(18, 0x53734e, "700") });
    this.feedback.anchor.set(0.5);
    this.feedback.position.set(0, 185);
    this.panel.addChild(this.feedback);

    options.quiz.choices.forEach((choice, index) => {
      const button = new CanvasButton({
        label: message(choice.labelMessage),
        width: 180,
        height: 58,
        color: 0xe3b879,
        onPress: () => {
          const result = options.onAnswer(choice.id);
          if (!result.ok) {
            this.feedback.style.fill = 0xa44f44;
            this.feedback.text = message("study.answerFailed");
            return;
          }
          if (!result.correct) {
            this.feedback.style.fill = 0xa44f44;
            this.feedback.text = message(result.feedbackMessage);
            return;
          }

          this.feedback.style.fill = 0x53734e;
          if (!this.completed && result.firstCompletion) {
            this.completed = true;
            this.feedback.text = message("study.rewardAwarded", {
              feedback: message(result.feedbackMessage),
              amount: result.coinsAwarded,
            });
          } else {
            this.completed = true;
            this.feedback.text = message("study.rewardAlreadyClaimed", {
              feedback: message(result.feedbackMessage),
            });
          }
        },
      });
      button.position.set(-290 + index * 200, 95);
      this.panel.addChild(button);
    });

    const close = new CanvasButton({
      label: message("study.close"),
      width: 180,
      height: 52,
      color: 0x91aa82,
      onPress: options.onClose,
    });
    close.position.set(-90, 210);
    this.panel.addChild(close);
  }

  layout(width: number, height: number): void {
    this.overlay.clear().rect(0, 0, width, height).fill({ color: 0x2f211a, alpha: 0.55 });
    this.panel.position.set(width / 2, height / 2);
  }
}
