import type { Texture } from "pixi.js";
import type { FurnitureKind } from "../../domain/room";

export type AnchoredTexture = {
  texture: Texture;
  anchor: { x: number; y: number };
};

export type ForestArt = {
  background: Texture;
  furniture: Record<FurnitureKind, AnchoredTexture>;
};
