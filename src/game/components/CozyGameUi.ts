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

/** 페이지 아래까지 이어지는 단일 크림색으로 전체 화면의 공통 배경을 만든다. */
export function createCozyPageBackground(width: number, height: number): Graphics {
  return new Graphics().rect(0, 0, width, height).fill(cozyColors.cream);
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
