import { Container, Graphics, Text } from "pixi.js";
import { textStyle } from "../config";

export class ToastLayer extends Container {
  private current: Container | null = null;
  private timer = 0;

  show(message: string, screenWidth: number): void {
    this.clearToast();
    const toast = new Container();
    const label = new Text({ text: message, style: textStyle(17, 0xfff8e8, "700") });
    label.anchor.set(0.5);
    const width = Math.max(260, label.width + 54);
    toast.addChild(
      new Graphics()
        .roundRect(-width / 2, -27, width, 54, 22)
        .fill({ color: 0x4a362c, alpha: 0.94 })
        .stroke({ color: 0xf1d2a2, width: 2 }),
      label,
    );
    toast.position.set(screenWidth / 2, 78);
    this.addChild(toast);
    this.current = toast;
    this.timer = window.setTimeout(() => this.clearToast(), 2200);
  }

  layout(screenWidth: number): void {
    this.current?.position.set(screenWidth / 2, 78);
  }

  private clearToast(): void {
    window.clearTimeout(this.timer);
    if (!this.current) {
      return;
    }
    this.removeChild(this.current);
    this.current.destroy({ children: true });
    this.current = null;
  }
}
