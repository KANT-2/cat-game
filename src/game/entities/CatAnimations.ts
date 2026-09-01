import type { LoadedSpriteSheet } from "../../assets/SpriteSheetLoader";

export const CAT_ACTIONS = [
  "idle",
  "walk",
  "run",
  "attack",
  "fall",
  "groom",
  "hit",
  "jump",
  "land",
  "scratch",
  "sleep",
  "surprise",
] as const;

export type CatAction = (typeof CAT_ACTIONS)[number];

export type CatAnimationSet = Record<CatAction, LoadedSpriteSheet>;
