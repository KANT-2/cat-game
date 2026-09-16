import { Graphics } from "pixi.js";

/**
 * 통계 아이콘 아트가 없을 때 쓰는 클립보드+막대그래프 글리프다.
 *
 * @remarks 클립·보드·막대를 전부 `size` 기준 비율로만 그려서, 어떤 크기로 호출해도
 * 항상 메달 원 안에 여유를 두고 들어간다(가장 튀어나오는 클립 윗부분까지 포함해도
 * 세로 전체 폭이 `size`의 68%를 넘지 않는다).
 */
export function drawStatsIcon(size: number): Graphics {
  const boardSize = size * 0.62;
  const half = boardSize / 2;
  const graphics = new Graphics();

  graphics
    .roundRect(-half, -half, boardSize, boardSize, boardSize * 0.16)
    .fill(0xfff3dc)
    .stroke({ color: 0x6b4226, width: Math.max(1.5, size * 0.035) });

  const clipWidth = boardSize * 0.34;
  const clipHeight = boardSize * 0.16;
  graphics
    .roundRect(-clipWidth / 2, -half - clipHeight * 0.55, clipWidth, clipHeight, clipHeight * 0.4)
    .fill(0xb8733e)
    .stroke({ color: 0x6b4226, width: Math.max(1.2, size * 0.03) });

  const barWidth = boardSize * 0.16;
  const gap = boardSize * 0.09;
  const heights = [boardSize * 0.32, boardSize * 0.52, boardSize * 0.72];
  const colors = [0xd99b5b, 0xe8a04b, 0x9a6a3a];
  const totalWidth = barWidth * heights.length + gap * (heights.length - 1);
  const startX = -totalWidth / 2;
  const baseY = half - boardSize * 0.14;
  heights.forEach((height, index) => {
    const x = startX + index * (barWidth + gap);
    graphics
      .roundRect(x, baseY - height, barWidth, height, barWidth * 0.25)
      .fill(colors[index])
      .stroke({ color: 0x4b3125, width: Math.max(1, size * 0.02) });
  });

  return graphics;
}
