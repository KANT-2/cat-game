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
  onPress: () => void;
};

export class CanvasButton extends Container {
  private readonly background = new Graphics();
  private readonly baseColor: number;

  constructor(options: CanvasButtonOptions) {
    super();
    this.baseColor = options.color ?? 0xd4a16b;
    this.drawBackground(false, options.width, options.height, options.borderColor);

    const label = new Text({ text: options.label, style: textStyle(17, options.textColor ?? 0x3c2a21, "700") });
    label.anchor.set(0.5);
    label.position.set(options.width / 2, options.height / 2);
    this.addChild(this.background, label);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () => this.drawBackground(true, options.width, options.height, options.borderColor));
    this.on("pointerout", () => this.drawBackground(false, options.width, options.height, options.borderColor));
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onPress();
    });
  }

  private drawBackground(hovered: boolean, width: number, height: number, borderColor = 0x67442f): void {
    this.background
      .clear()
      .roundRect(0, 5, width, height, Math.min(20, height / 2))
      .fill({ color: 0x5a351f, alpha: 0.22 })
      .roundRect(0, 0, width, height, Math.min(20, height / 2))
      .fill(hovered ? lighten(this.baseColor, 0.12) : this.baseColor)
      .stroke({ color: borderColor, width: 3 });
  }
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 255 * amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + 255 * amount);
  const b = Math.min(255, (color & 0xff) + 255 * amount);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
