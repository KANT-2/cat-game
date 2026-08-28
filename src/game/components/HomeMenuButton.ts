import { Container, type FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { textStyle } from "../config";

export type HomeMenuIcon = "settings" | "friends" | "ranking" | "study" | "quest" | "gacha" | "shop";

type HomeMenuButtonOptions = {
  icon: HomeMenuIcon;
  label: string;
  onPress: () => void;
};

/** 홈 화면 가장자리에 배치하는 아이콘형 Canvas 메뉴 버튼입니다. */
export class HomeMenuButton extends Container {
  private readonly background = new Graphics();
  private readonly accentColor: number;

  constructor(options: HomeMenuButtonOptions) {
    super();
    this.accentColor = menuAccent(options.icon);
    this.drawBackground(false);
    const icon = drawIcon(options.icon);
    icon.scale.set(options.icon === "settings" ? 1.12 : 1.08);
    icon.position.set(52, 42);
    const label = new Text({
      text: options.label,
      style: {
        ...textStyle(15, 0x3d2b22, "800"),
        align: "center",
        stroke: { color: 0xfff2d7, width: 4 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(52, 96);
    this.addChild(this.background, icon, label);
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
    const scale = hovered ? 1.06 : 1;
    this.background.scale.set(scale);
    this.background.position.set(52 - 52 * scale, 42 - 42 * scale);
    this.background
      .clear()
      .ellipse(55, 47, 42, 14)
      .fill({ color: 0x5b3826, alpha: 0.2 })
      .circle(52, 40, 39)
      .fill(0xffeed0)
      .stroke({ color: 0x5e3927, width: 5 })
      .circle(52, 40, 33)
      .fill(hovered ? lighten(this.accentColor) : this.accentColor)
      .stroke({ color: 0xd39a62, width: 2 })
      .ellipse(39, 27, 10, 6)
      .fill({ color: 0xffffff, alpha: 0.36 });
  }
}

function menuAccent(kind: HomeMenuIcon): number {
  if (kind === "settings") {
    return 0xd4a45f;
  }
  if (kind === "friends") {
    return 0xe8b776;
  }
  if (kind === "ranking") {
    return 0xf1c266;
  }
  if (kind === "study") {
    return 0xd9edf0;
  }
  if (kind === "quest") {
    return 0xf4cd88;
  }
  if (kind === "gacha") {
    return 0xe9b0b7;
  }
  return 0xefad63;
}

function lighten(color: number): number {
  const red = Math.min(255, ((color >> 16) & 0xff) + 22);
  const green = Math.min(255, ((color >> 8) & 0xff) + 22);
  const blue = Math.min(255, (color & 0xff) + 22);
  return (red << 16) | (green << 8) | blue;
}

function drawIcon(kind: HomeMenuIcon): Graphics {
  const icon = new Graphics();
  const brown = 0x553525;
  const orange = 0xe8943f;
  if (kind === "settings") {
    return icon
      .circle(0, 0, 18)
      .fill(orange)
      .stroke({ color: brown, width: 4 })
      .circle(0, 0, 7)
      .fill(0xffefd3)
      .moveTo(-25, 0)
      .lineTo(-17, 0)
      .moveTo(17, 0)
      .lineTo(25, 0)
      .moveTo(0, -25)
      .lineTo(0, -17)
      .moveTo(0, 17)
      .lineTo(0, 25)
      .stroke({ color: brown, width: 6, cap: "round" });
  }
  if (kind === "friends") {
    return icon
      .circle(-10, -8, 10)
      .fill(0xffc569)
      .stroke({ color: brown, width: 3 })
      .circle(13, -5, 8)
      .fill(0xf2a95e)
      .stroke({ color: brown, width: 3 })
      .roundRect(-28, 5, 36, 22, 11)
      .fill(0xffd994)
      .stroke({ color: brown, width: 3 })
      .roundRect(8, 8, 27, 18, 9)
      .fill(0xf5bf78)
      .stroke({ color: brown, width: 3 });
  }
  if (kind === "ranking") {
    return icon
      .poly([-23, -14, -9, -14, -6, 5, 6, 13, 18, 5, 22, -14, 8, -14, 5, -4, -6, -4, -9, -14])
      .fill(0xffbd3e)
      .stroke({ color: brown, width: 4 })
      .roundRect(-12, 13, 25, 8, 4)
      .fill(orange);
  }
  if (kind === "study") {
    return icon
      .roundRect(-25, -20, 50, 40, 7)
      .fill(0xfff8e8)
      .stroke({ color: brown, width: 4 })
      .moveTo(0, -19)
      .lineTo(0, 19)
      .moveTo(-18, -10)
      .lineTo(-7, -7)
      .moveTo(7, -7)
      .lineTo(18, -10)
      .stroke({ color: orange, width: 3, cap: "round" });
  }
  if (kind === "quest") {
    return icon
      .roundRect(-21, -23, 42, 47, 7)
      .fill(0xffe4ad)
      .stroke({ color: brown, width: 4 })
      .moveTo(-11, -6)
      .lineTo(-5, 0)
      .lineTo(8, -13)
      .moveTo(-11, 10)
      .lineTo(-5, 16)
      .lineTo(10, 1)
      .stroke({ color: 0x639057, width: 5, cap: "round", join: "round" });
  }
  if (kind === "gacha") {
    return icon
      .circle(0, -9, 23)
      .fill(0xb9dfea)
      .stroke({ color: brown, width: 4 })
      .circle(-8, -12, 7)
      .fill(0xf0a0ad)
      .circle(8, -6, 7)
      .fill(0xffd16d)
      .roundRect(-18, 14, 36, 16, 7)
      .fill(orange)
      .stroke({ color: brown, width: 4 });
  }
  return icon
    .roundRect(-24, -15, 48, 37, 6)
    .fill(0xf3b15f)
    .stroke({ color: brown, width: 4 })
    .moveTo(-17, -15)
    .bezierCurveTo(-15, -34, 15, -34, 17, -15)
    .stroke({ color: brown, width: 5 })
    .poly([-8, -6, 0, -14, 8, -6, 5, 7, -5, 7])
    .fill(0xffedc9)
    .stroke({ color: orange, width: 2 });
}
