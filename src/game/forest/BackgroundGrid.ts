import type { ShopItemId } from "../../domain/shop";
import type { BeltGrid } from "../belt";
import { CLEARING_GRID } from "../config";

export type WallpaperItemId = Extract<ShopItemId, `wallpaper.${string}`>;

const grid = (farY: number, nearY: number, farWidth: number, nearWidth: number, centerX = 800): BeltGrid => ({
  columns: CLEARING_GRID.columns,
  rows: CLEARING_GRID.rows,
  centerX,
  farY,
  nearY,
  farWidth,
  nearWidth,
});

/** 배경 이미지에서 실제로 비어 있는 바닥 면에 맞춘 화면 투영 프로필이다. */
export const backgroundGridProfiles = {
  "wallpaper.cream": CLEARING_GRID,
  "wallpaper.cloud": grid(560, 850, 1_240, 1_500),
  "wallpaper.forest": grid(585, 840, 1_160, 1_480),
  "wallpaper.flower": grid(600, 850, 1_120, 1_480),
  "wallpaper.night": grid(530, 810, 1_080, 1_460),
  "wallpaper.cat": grid(570, 850, 1_060, 1_460),
  "wallpaper.modernAlley": grid(610, 850, 1_100, 1_450),
  "wallpaper.villageAlley": grid(610, 850, 1_120, 1_450),
  "wallpaper.sunnyStudio": grid(575, 850, 1_080, 1_460),
  "wallpaper.livingRoom": grid(590, 850, 1_060, 1_450),
  "wallpaper.cityOffice": grid(590, 850, 1_080, 1_440),
  "wallpaper.botanicalDesk": grid(530, 800, 1_060, 1_440),
  "wallpaper.musicDesk": grid(510, 800, 1_080, 1_450),
  "wallpaper.sandyCove": grid(520, 850, 1_120, 1_440),
  "wallpaper.seasidePromenade": grid(600, 840, 1_180, 1_480),
  "wallpaper.workingHarbor": grid(580, 790, 1_120, 1_400),
} as const satisfies Record<WallpaperItemId, BeltGrid>;

/**
 * 적용 중인 배경의 실제 바닥 면에 맞는 투영 격자를 반환한다.
 *
 * @param wallpaperId - 저장 상태의 배경 상품 ID. 배경을 선택하지 않았으면 `null`이다.
 * @returns 저장·충돌용 `10 × 8` 셀 수는 유지하고 화면 사다리꼴만 배경에 맞춘 격자.
 *
 * @remarks 저장된 가구 좌표나 충돌 결과는 변경하지 않는 읽기 전용 선택 함수다. 알 수 없거나
 * 배경이 아닌 ID는 기본 숲 공터 프로필로 안전하게 되돌린다.
 */
export function resolveBackgroundGrid(wallpaperId?: ShopItemId | null): BeltGrid {
  if (!wallpaperId?.startsWith("wallpaper.")) {
    return backgroundGridProfiles["wallpaper.cream"];
  }
  return backgroundGridProfiles[wallpaperId as WallpaperItemId] ?? backgroundGridProfiles["wallpaper.cream"];
}
