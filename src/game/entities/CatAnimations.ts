import type { LoadedSpriteSheet } from "../../assets/SpriteSheetLoader";
import type { CatVariant } from "../../domain/cats";

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
  "scruffLift",
] as const;

export type CatAction = (typeof CAT_ACTIONS)[number];

export type CatAnimationSet = Record<CatAction, LoadedSpriteSheet>;

export type CatAnimationLibrary = Record<CatVariant, CatAnimationSet>;
