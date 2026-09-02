import { Container, type FederatedPointerEvent, Graphics, Rectangle, Sprite } from "pixi.js";

export type HomeMenuButtonOptions = {
  iconSrc: string;
  size?: number;
  onPress: () => void;
};

/** 카탈로그 이미지로 표시하는 홈 화면의 원형 Canvas 메뉴 버튼이다. */
export class HomeMenuButton extends Container {
  private readonly background = new Graphics();
  private readonly size: number;

  constructor(options: HomeMenuButtonOptions) {
    super();
    this.size = options.size ?? 76;
    this.drawBackground(false);

    const icon = Sprite.from(options.iconSrc);
    icon.anchor.set(0.5);
    icon.position.set(this.size / 2, this.size / 2);
    icon.width = this.size * 0.72;
    icon.height = this.size * 0.72;
    this.addChild(this.background, icon);

    this.hitArea = new Rectangle(0, 0, this.size, this.size);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () => this.drawBackground(true));
    this.on("pointerout", () => this.drawBackground(false));
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onPress();
    });
  }

  private drawBackground(hovered: boolean): void {
    const radius = this.size / 2;
    this.background
      .clear()
      .circle(radius, radius + 4, radius - 2)
      .fill({ color: 0x5b3826, alpha: 0.18 })
      .circle(radius, radius, radius - 3)
      .fill(hovered ? 0xfff6df : 0xffeed0)
      .stroke({ color: 0x5e3927, width: 4 });
  }
}
