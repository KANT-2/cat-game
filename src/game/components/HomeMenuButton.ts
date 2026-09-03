import { Container, type FederatedPointerEvent, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { textStyle } from "../config";
import { applySmoothTextureSampling } from "./smoothSprite";

export type HomeMenuButtonOptions = {
  iconSrc: string;
  label: string;
  medallion?: boolean;
  size?: number;
  visualScale?: number;
  hitAreaHeight?: number;
  onPress: () => void;
};

/** 카탈로그 이미지와 Canvas 라벨을 함께 표시하는 홈 화면 메뉴 버튼이다. */
export class HomeMenuButton extends Container {
  private readonly background = new Graphics();
  private readonly size: number;
  private readonly medallion: boolean;
  private readonly visualScale: number;

  constructor(options: HomeMenuButtonOptions) {
    super();
    this.size = options.size ?? 116;
    this.medallion = options.medallion ?? false;
    this.visualScale = options.visualScale ?? 1;
    this.drawBackground(false);

    const icon = Sprite.from(options.iconSrc);
    applySmoothTextureSampling(icon);
    icon.anchor.set(0.5);
    icon.position.set(this.size / 2, this.visualY(44));
    const iconSize = (this.medallion ? 78 : 94) * this.visualScale;
    icon.width = iconSize;
    icon.height = iconSize;

    const label = new Text({
      text: options.label,
      style: {
        ...textStyle(13, 0x4b3021, "800"),
      },
    });
    label.anchor.set(0.5);
    label.position.set(this.size / 2, this.visualY(92));
    const maximumLabelWidth = this.size - 4;
    if (label.width > maximumLabelWidth) {
      label.scale.set(maximumLabelWidth / label.width);
    }

    const labelPlate = new Graphics()
      .roundRect(
        this.size / 2 - label.width / 2 - 7,
        label.y - label.height / 2 - 3,
        label.width + 14,
        label.height + 6,
        8,
      )
      .fill({ color: 0xffedcd, alpha: 0.84 })
      .stroke({ color: 0x9a6846, width: 1.5 });
    this.addChild(this.background, icon, labelPlate, label);

    const hitAreaHeight = options.hitAreaHeight ?? this.size;
    this.hitArea = new Rectangle(0, (this.size - hitAreaHeight) / 2, this.size, hitAreaHeight);
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
    this.background.clear();
    if (!this.medallion) {
      if (hovered) {
        this.background
          .circle(this.size / 2, this.visualY(44), 48 * this.visualScale)
          .fill({ color: 0xfff1c9, alpha: 0.3 });
      }
      return;
    }

    const centerX = this.size / 2;
    const centerY = this.visualY(44);
    const fillColor = hovered ? 0xffdc97 : 0xf2c47f;
    this.background
      .circle(centerX, centerY + 4 * this.visualScale, 47 * this.visualScale)
      .fill({ color: 0x4b2d20, alpha: 0.28 })
      .circle(centerX, centerY, 46 * this.visualScale)
      .fill(fillColor)
      .stroke({ color: 0x4b2b1e, width: Math.max(2, 4 * this.visualScale) })
      .circle(centerX, centerY, 38 * this.visualScale)
      .fill({ color: 0xffe8b2, alpha: 0.72 })
      .stroke({ color: 0xb56e35, width: Math.max(1, 2 * this.visualScale) });
  }

  private visualY(sourceY: number): number {
    return (this.size * (1 - this.visualScale)) / 2 + sourceY * this.visualScale;
  }
}
