import { Container, type FederatedPointerEvent, Graphics, type Point, Sprite } from "pixi.js";
import { furnitureDefinitions, type PlacedFurniture, rotatedSize } from "../../domain/room";
import { CLEARING_GRID } from "../config";
import type { AnchoredTexture } from "./ForestArt";

type FurnitureViewOptions = {
  item: PlacedFurniture;
  art: AnchoredTexture;
  project: (x: number, y: number) => Point;
  onTap: (item: PlacedFurniture) => void;
};

const FURNITURE_DISPLAY_SIZE = {
  sofa: { width: 270, height: 66 },
  desk: { width: 235, height: 75 },
  plant: { width: 180, height: 113 },
  catTree: { width: 160, height: 202 },
  bed: { width: 260, height: 76 },
} as const;

export class FurnitureView extends Container {
  constructor({ item, art, project, onTap }: FurnitureViewOptions) {
    super({ label: `furniture:${item.id}` });
    const definition = furnitureDefinitions[item.kind];
    const size = rotatedSize(definition, item.rotation);
    const groundPoint = project(item.x + size.width / 2, item.y + size.height);
    this.position.set(groundPoint.x, groundPoint.y - 17);
    this.zIndex = Math.round((item.y + size.height) * 100);
    this.eventMode = "static";
    this.cursor = "pointer";

    const displaySize = FURNITURE_DISPLAY_SIZE[item.kind];
    const depth = Math.max(
      0,
      Math.min(1, (groundPoint.y - CLEARING_GRID.farY) / (CLEARING_GRID.nearY - CLEARING_GRID.farY)),
    );
    const perspectiveScale = 0.78 + depth * 0.22;
    const displayWidth = displaySize.width * perspectiveScale;
    const displayHeight = displaySize.height * perspectiveScale;
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
