import { Container, type FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { textStyle } from "../config";

/** Canvas 버튼의 표시 크기, 색상과 입력 콜백이다. */
export type CanvasButtonOptions = {
  label: string;
  width: number;
  height: number;
  color?: number;
  textColor?: number;
  borderColor?: number;
  fontSize?: number;
  onPress: () => void;
};

export class CanvasButton extends Container {
  private readonly background = new Graphics();
  private readonly baseColor: number;
  private readonly labelText: Text;

  constructor(options: CanvasButtonOptions) {
    super();
    this.baseColor = options.color ?? 0xd4a16b;
    this.drawBackground(false, options.width, options.height, options.borderColor);

    this.labelText = new Text({
      text: options.label,
      style: {
        ...textStyle(options.fontSize ?? 17, options.textColor ?? 0x3c2a21, "700"),
        dropShadow: { color: 0xffffff, alpha: 0.48, angle: -Math.PI / 2, blur: 0, distance: 1 },
      },
    });
    this.labelText.anchor.set(0.5);
    this.labelText.position.set(options.width / 2, options.height / 2);
    this.addChild(this.background, this.labelText);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () => this.drawBackground(true, options.width, options.height, options.borderColor));
    this.on("pointerout", () => this.drawBackground(false, options.width, options.height, options.borderColor));
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onPress();
    });
  }

  /** 버튼을 다시 만들지 않고 현재 표시 문구만 갱신한다. */
  setLabel(value: string): void {
    this.labelText.text = value;
  }

  private drawBackground(hovered: boolean, width: number, height: number, borderColor = 0x67442f): void {
    const radius = Math.min(18, height / 2);
    const faceColor = hovered ? lighten(this.baseColor, 0.12) : this.baseColor;
    this.background
      .clear()
      .roundRect(0, 7, width, height, radius)
      .fill({ color: 0x4f2b18, alpha: 0.32 })
      .roundRect(0, 0, width, height, radius)
      .fill(faceColor)
      .stroke({ color: borderColor, width: 3 })
      .roundRect(4, 4, width - 8, Math.max(12, height * 0.38), Math.max(7, radius - 4))
      .fill({ color: 0xffffff, alpha: hovered ? 0.25 : 0.17 })
      .moveTo(radius, height - 5)
      .lineTo(width - radius, height - 5)
      .stroke({ color: 0x7a4427, width: 2, alpha: 0.28 });
  }
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
  const b = Math.min(255, (color & 0xff) + 255 * amount);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
