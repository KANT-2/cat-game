import type { PlacedFurniture } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";

export type FurnitureShadowStyle = {
  alpha: number;
  scaleX: number;
  scaleY: number;
  offsetY: number;
};

const SHADOWLESS_ITEMS = new Set<ShopItemId>([
  "decor.alley-food-bowl",
  "decor.alley-water-bowl",
  "decor.crushed-can",
  "decor.old-brick",
  "decor.paper-ball",
  "decor.plastic-bottle",
  "decor.newspaper-stack",
  "decor.litter-scoop",
  "decor.yarn-ball",
  "decor.teaser-set",
  "decor.fur-pile",
  "decor.room-water-bowl",
  "decor.room-food-bowl",
]);

const LOW_PROFILE_KINDS = new Set<PlacedFurniture["kind"]>(["bed", "sofa", "litterBox"]);

/** 바닥에 닿는 형태에 따라 원본 알파 실루엣으로 사영할 가구 그림자를 결정한다.
 *
 * @returns 러그와 얇은 바닥 소품은 `null`, 그 외에는 불투명도와 눌린 사영 비율을 반환한다.
 * @remarks 그림자는 충돌이나 배치 규칙이 아닌 Canvas 표현 정책이며 이미지 자체의 그림자를 변경하지 않는다.
 */
export function resolveFurnitureShadow(item: PlacedFurniture): FurnitureShadowStyle | null {
  if (item.shopItemId && SHADOWLESS_ITEMS.has(item.shopItemId)) {
    return null;
  }
  if (item.kind === "rug" && item.shopItemId !== "decor.fallen-log") {
    return null;
  }
  if (item.shopItemId === "decor.fallen-log") {
    return { alpha: 0.1, scaleX: 0.9, scaleY: 0.14, offsetY: 9 };
  }
  if (LOW_PROFILE_KINDS.has(item.kind)) {
    return { alpha: 0.08, scaleX: 0.88, scaleY: 0.12, offsetY: 8 };
  }
  if (item.kind === "catTree" || item.kind === "plant") {
    return { alpha: 0.13, scaleX: 0.82, scaleY: 0.12, offsetY: 9 };
  }
  return { alpha: 0.11, scaleX: 0.86, scaleY: 0.13, offsetY: 9 };
}
