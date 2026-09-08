import { Container, Graphics, Sprite, Text } from "pixi.js";
import { textStyle } from "../config";
import { applySmoothTextureSampling } from "./smoothSprite";

export type CurrencyBarView = {
  container: Container;
  amountText: Text;
};

type CoinAmountOptions = {
  color?: number;
  fontSize?: number;
  gap?: number;
  iconSize?: number;
  order?: "icon-first" | "amount-first";
};

/**
 * 단일 코인 재화를 표시하는 공통 HUD 바를 만든다.
 *
 * @param iconSrc - 에셋 카탈로그에서 해석한 투명 코인 이미지 경로.
 * @param amount - 표시할 현재 코인 수량.
 * @param width - 논리 화면 좌표 기준 바 너비.
 * @returns 화면에 배치할 컨테이너와 수량 갱신에 사용할 텍스트 객체.
 */
export function createCurrencyBar(iconSrc: string, amount: number, width = 320): CurrencyBarView {
  const container = new Container();
  const background = new Graphics().roundRect(0, 0, width, 62, 25).fill(0xf3d4aa).stroke({ color: 0x70442b, width: 4 });
  const icon = createCoinIcon(iconSrc, 48);
  icon.position.set(14, 7);
  const amountText = new Text({ text: amount.toLocaleString(), style: textStyle(22, 0x3d2b22, "800") });
  amountText.anchor.set(1, 0.5);
  amountText.position.set(width - 24, 31);
  container.addChild(background, icon, amountText);
  return { container, amountText };
}

/**
 * 같은 코인 원본을 가격표와 보상 표시에 재사용할 수 있는 스프라이트로 만든다.
 *
 * @param iconSrc - 에셋 카탈로그에서 해석한 투명 코인 이미지 경로.
 * @param size - 논리 화면 좌표 기준 정사각 표시 크기.
 * @returns 부드러운 텍스처 샘플링이 적용된 코인 스프라이트.
 */
export function createCoinIcon(iconSrc: string, size: number): Sprite {
  const icon = Sprite.from(iconSrc);
  applySmoothTextureSampling(icon);
  icon.width = size;
  icon.height = size;
  return icon;
}

/**
 * 코인 아이콘과 금액을 같은 세로 중심선에 맞춘 한 줄 표시로 만든다.
 *
 * @param iconSrc - 에셋 카탈로그에서 해석한 코인 이미지 경로.
 * @param amount - 표시할 숫자 또는 `+50`처럼 이미 조합된 금액 문구.
 * @param options - 글자와 아이콘 크기, 간격 및 표시 순서.
 * @returns 다른 텍스트 옆에 하나의 묶음으로 배치할 수 있는 컨테이너.
 */
export function createCoinAmount(iconSrc: string, amount: string | number, options: CoinAmountOptions = {}): Container {
  const fontSize = options.fontSize ?? 18;
  const iconSize = options.iconSize ?? fontSize + 6;
  const gap = options.gap ?? 8;
  const order = options.order ?? "icon-first";
  const container = new Container();
  const icon = createCoinIcon(iconSrc, iconSize);
  const amountText = new Text({
    text: typeof amount === "number" ? amount.toLocaleString() : amount,
    style: textStyle(fontSize, options.color ?? 0x654126, "800"),
  });
  icon.anchor.set(0, 0.5);
  amountText.anchor.set(0, 0.5);
  if (order === "icon-first") {
    icon.position.set(0, 0);
    amountText.position.set(iconSize + gap, 0);
  } else {
    amountText.position.set(0, 0);
    icon.position.set(amountText.width + gap, 0);
  }
  container.addChild(icon, amountText);
  return container;
}
