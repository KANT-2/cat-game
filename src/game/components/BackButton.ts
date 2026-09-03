import { Container, type FederatedPointerEvent, Rectangle, Sprite } from "pixi.js";
import { applySmoothTextureSampling } from "./smoothSprite";

type BackButtonOptions = {
  iconSrc: string;
  size?: number;
  onPress: () => void;
};

/** 첨부 디자인의 공통 PNG를 사용해 모든 전체 화면에서 동일한 뒤로가기 동작을 제공한다. */
export class BackButton extends Container {
  private readonly icon: Sprite;

  constructor(options: BackButtonOptions) {
    super();
    const size = options.size ?? 72;
    this.icon = Sprite.from(options.iconSrc);
    applySmoothTextureSampling(this.icon);
    this.icon.width = size;
    this.icon.height = size;
    this.addChild(this.icon);
    this.hitArea = new Rectangle(0, 0, size, size);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointerover", () => this.setHovered(true));
    this.on("pointerout", () => this.setHovered(false));
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onPress();
    });
  }

  private setHovered(hovered: boolean): void {
    this.icon.alpha = hovered ? 0.9 : 1;
    this.icon.position.set(hovered ? 1 : 0, hovered ? 1 : 0);
  }
}
