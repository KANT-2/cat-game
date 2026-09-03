import { Graphics } from "pixi.js";

export const cozyColors = {
  ink: 0x4a2b1c,
  border: 0x87502e,
  borderSoft: 0xc89462,
  cream: 0xfff5df,
  creamLight: 0xfffff4,
  creamDark: 0xf2d7aa,
  amber: 0xf3a742,
  amberLight: 0xffcf72,
  wood: 0xb8733e,
  woodDark: 0x603820,
  sage: 0x91aa55,
} as const;

type CozyPanelOptions = {
  fill?: number;
  border?: number;
  radius?: number;
  shadowAlpha?: number;
  inset?: boolean;
};

/** 따뜻한 종이 질감과 바닥 장식을 절차적으로 그려 전체 화면의 공통 분위기를 만든다. */
export function createCozyPageBackground(width: number, height: number, floorY = height - 118): Graphics {
  const background = new Graphics()
    .rect(0, 0, width, height)
    .fill(cozyColors.creamDark)
    .rect(0, 0, width, floorY)
    .fill(cozyColors.cream)
    .circle(95, 115, 190)
    .fill({ color: 0xffd795, alpha: 0.22 })
    .circle(width - 80, 165, 230)
    .fill({ color: 0xffc981, alpha: 0.16 })
    .circle(width - 240, height - 30, 280)
    .fill({ color: 0xd9c892, alpha: 0.18 })
    .rect(0, floorY, width, height - floorY)
    .fill(0xd8a06a)
    .rect(0, floorY, width, 7)
    .fill(0xb77848);
  for (let x = -120; x < width + 120; x += 180) {
    background
      .moveTo(x, floorY + 7)
      .lineTo(x + 90, height)
      .stroke({ color: 0xb67b4c, width: 2, alpha: 0.22 });
  }
  return background;
}

/** 그림자·두 겹 테두리·안쪽 하이라이트가 있는 게임용 카드 패널을 만든다. */
export function createCozyPanel(
  x: number,
  y: number,
  width: number,
  height: number,
  options: CozyPanelOptions = {},
): Graphics {
  const radius = options.radius ?? 24;
  const fill = options.fill ?? cozyColors.creamLight;
  const border = options.border ?? cozyColors.border;
  const panel = new Graphics()
    .roundRect(x + 5, y + 9, width, height, radius)
    .fill({ color: cozyColors.woodDark, alpha: options.shadowAlpha ?? 0.2 })
    .roundRect(x, y, width, height, radius)
    .fill(fill)
    .stroke({ color: border, width: 4 });
  if (options.inset !== false && width > 28 && height > 28) {
    panel
      .roundRect(x + 9, y + 9, width - 18, height - 18, Math.max(8, radius - 8))
      .stroke({ color: 0xffffff, width: 2, alpha: 0.55 });
  }
  return panel;
}

/** 페이지 제목 아래에 놓는 짧은 우드 장식선을 만든다. */
export function createTitleOrnament(x: number, y: number, width: number): Graphics {
  return new Graphics()
    .roundRect(x, y, width, 5, 3)
    .fill(cozyColors.borderSoft)
    .circle(x - 8, y + 2.5, 4)
    .circle(x + width + 8, y + 2.5, 4)
    .fill(cozyColors.amber);
}
