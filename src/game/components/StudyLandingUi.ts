import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { textStyle } from "../config";

/**
 * 학습 첫 화면의 종이 질감을 드러내는 얇은 테두리 패널을 만든다.
 * @param x - 1600×900 장면의 가로 좌표.
 * @param y - 1600×900 장면의 세로 좌표.
 * @param width - 논리 픽셀 너비.
 * @param height - 논리 픽셀 높이.
 * @returns 배경 위에 겹쳐 놓을 반투명 패널.
 */
export function createStudyPanel(x: number, y: number, width: number, height: number): Graphics {
  return new Graphics()
    .roundRect(x, y, width, height, 18)
    .fill({ color: 0xfff7e8, alpha: 0.32 })
    .stroke({ color: 0xd6a36e, width: 1.8 })
    .roundRect(x + 4, y + 4, width - 8, height - 8, 15)
    .stroke({ color: 0xfffdf1, width: 1, alpha: 0.65 });
}

/**
 * 제목 옆의 작은 잎 장식을 만든다.
 * @returns 원점 기준으로 배치하거나 좌우 반전할 수 있는 장식.
 */
export function createStudyLeaves(): Graphics {
  return new Graphics()
    .moveTo(0, 20)
    .quadraticCurveTo(-20, 9, -20, -17)
    .quadraticCurveTo(7, -12, 0, 20)
    .fill(0x9fb86f)
    .stroke({ color: 0x5e793e, width: 1.5 })
    .moveTo(3, 25)
    .quadraticCurveTo(-11, 17, -17, -9)
    .stroke({ color: 0x698044, width: 2 })
    .ellipse(-10, 26, 9, 4)
    .fill(0x789456);
}

type StudySubjectButtonOptions = {
  label: string;
  description: string;
  color: number;
  width?: number;
  height?: number;
  onPress: () => void;
};

/** 색상 띠와 주제 이름을 표시하는 학습 첫 화면 전용 주제 버튼이다. */
export class StudySubjectButton extends Container {
  constructor(options: StudySubjectButtonOptions) {
    super();
    const width = options.width ?? 435;
    const height = options.height ?? 130;
    const shadow = new Graphics().roundRect(0, 6, width, height, 14).fill({ color: 0x79512c, alpha: 0.16 });
    const face = new Graphics();
    const drawFace = (hovered: boolean) => {
      face
        .clear()
        .roundRect(0, 0, width, height, 14)
        .fill(options.color)
        .roundRect(1, 16, width - 2, height - 17, 12)
        .fill(hovered ? 0xfff8e8 : 0xfaf0da)
        .rect(1, 16, width - 2, 12)
        .fill(hovered ? 0xfff8e8 : 0xfaf0da)
        .roundRect(0, 0, width, height, 14)
        .stroke({ color: 0x88512d, width: 2 })
        .roundRect(4, 4, width - 8, height - 8, 11)
        .stroke({ color: 0xfffdf0, width: 1, alpha: 0.65 });
    };
    drawFace(false);
    const title = new Text({ text: options.label, style: textStyle(32, 0x4a2b1c, "800") });
    title.position.set(25, height >= 145 ? 36 : 31);
    const description = new Text({ text: options.description, style: textStyle(19, 0x6e4e3a, "600") });
    description.position.set(25, height >= 145 ? 91 : 80);
    const arrow = new Graphics()
      .moveTo(width - 43, height / 2 - 10)
      .lineTo(width - 33, height / 2)
      .lineTo(width - 43, height / 2 + 10)
      .stroke({ color: 0x754322, width: 4, cap: "round", join: "round" });
    this.addChild(shadow, face, title, description, arrow);
    this.hitArea = new Rectangle(0, 0, width, height);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () => drawFace(true));
    this.on("pointerout", () => drawFace(false));
    this.on("pointertap", (event) => {
      event.stopPropagation();
      options.onPress();
    });
  }
}
