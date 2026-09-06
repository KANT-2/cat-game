import { Container, type FederatedPointerEvent, Graphics, type Point, Sprite } from "pixi.js";
import { type FurnitureKind, furnitureDefinitions, type PlacedFurniture, rotatedSize } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import type { BeltGrid } from "../belt";
import type { AnchoredTexture } from "./ForestArt";

type FurnitureViewOptions = {
  item: PlacedFurniture;
  art: AnchoredTexture;
  grid: BeltGrid;
  project: (x: number, y: number) => Point;
  onTap: (item: PlacedFurniture) => void;
};

const FURNITURE_DISPLAY_SIZE: Record<FurnitureKind, { width: number; height: number }> = {
  sofa: { width: 270, height: 66 },
  desk: { width: 235, height: 75 },
  plant: { width: 180, height: 113 },
  catTree: { width: 160, height: 202 },
  bed: { width: 260, height: 76 },
  rug: { width: 285, height: 92 },
  hideout: { width: 270, height: 165 },
  scratcher: { width: 190, height: 180 },
  litterBox: { width: 270, height: 150 },
};

const SHOP_FURNITURE_DISPLAY_SIZE: Partial<Record<ShopItemId, { width: number; height: number }>> = {
  "furniture.sofa": { width: 320, height: 212 },
  "furniture.table": { width: 235, height: 75 },
  "furniture.catTower": { width: 160, height: 240 },
  "furniture.bed": { width: 260, height: 76 },
  "furniture.desk": { width: 270, height: 156 },
  "furniture.premiumTower": { width: 215, height: 323 },
  "furniture.forest.bench-2": { width: 320, height: 213 },
  "decor.plant": { width: 180, height: 113 },
  "decor.reed-clump": { width: 185, height: 140 },
  "decor.rock-angular": { width: 115, height: 172 },
  "decor.rock-round": { width: 210, height: 112 },
  "decor.fallen-log": { width: 300, height: 131 },
  "decor.cardboard-box": { width: 150, height: 136 },
  "decor.trash-bag": { width: 120, height: 128 },
  "decor.sealed-box": { width: 130, height: 124 },
  "decor.plastic-crate": { width: 140, height: 109 },
  "decor.alley-food-bowl": { width: 120, height: 80 },
  "decor.alley-water-bowl": { width: 120, height: 82 },
  "decor.crushed-can": { width: 75, height: 58 },
  "decor.old-brick": { width: 90, height: 67 },
  "decor.paper-ball": { width: 50, height: 50 },
  "decor.plastic-bottle": { width: 80, height: 66 },
  "decor.newspaper-stack": { width: 100, height: 70 },
  "decor.litter-scoop": { width: 80, height: 79 },
  "decor.yarn-ball": { width: 65, height: 44 },
  "decor.teaser-set": { width: 140, height: 96 },
  "decor.fur-pile": { width: 90, height: 77 },
  "decor.room-water-bowl": { width: 120, height: 76 },
  "decor.room-food-bowl": { width: 120, height: 78 },
};

export class FurnitureView extends Container {
  constructor({ item, art, grid, project, onTap }: FurnitureViewOptions) {
    super({ label: `furniture:${item.id}` });
    const definition = furnitureDefinitions[item.kind];
    const size = rotatedSize(definition, item.rotation);
    const groundPoint = project(item.x + size.width / 2, item.y + size.height);
    this.position.set(groundPoint.x, groundPoint.y - 17);
    this.zIndex = Math.round((item.y + size.height) * 100);
    this.eventMode = "static";
    this.cursor = "pointer";

    const explicitDisplaySize = item.shopItemId ? SHOP_FURNITURE_DISPLAY_SIZE[item.shopItemId] : undefined;
    const displaySize = explicitDisplaySize ?? FURNITURE_DISPLAY_SIZE[item.kind];
    const depth = Math.max(0, Math.min(1, (groundPoint.y - grid.farY) / (grid.nearY - grid.farY)));
    const perspectiveScale = 0.78 + depth * 0.22;
    const fitScale = explicitDisplaySize
      ? 1
      : Math.min(displaySize.width / art.texture.width, displaySize.height / art.texture.height);
    const displayWidth = (explicitDisplaySize ? displaySize.width : art.texture.width * fitScale) * perspectiveScale;
    const displayHeight = (explicitDisplaySize ? displaySize.height : art.texture.height * fitScale) * perspectiveScale;
    const shadowAlpha = item.kind === "sofa" || item.kind === "bed" ? 0.1 : 0.18;
    this.addChild(
      new Graphics()
        .ellipse(0, 13, displayWidth * 0.42, Math.max(6, displayHeight * 0.075))
        .fill({ color: 0x234b2d, alpha: shadowAlpha }),
    );

    const sprite = new Sprite(art.texture);
    sprite.anchor.set(art.anchor.x, art.anchor.y);
    sprite.width = displayWidth;
    sprite.height = displayHeight;
    if (item.rotation === 1) {
      sprite.scale.x *= -1;
    }
    this.addChild(sprite);

    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      onTap(item);
    });
  }
}
