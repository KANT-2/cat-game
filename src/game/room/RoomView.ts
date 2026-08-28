import { Container, Graphics, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { PlacementCommand, PlacementResult } from "../../core/GameClient";
import {
  type FurnitureKind,
  furnitureDefinitions,
  isPlacementFree,
  type PlacedFurniture,
  ROOM_GRID_HEIGHT,
  ROOM_GRID_WIDTH,
  rotatedSize,
} from "../../domain/room";
import { TILE_HEIGHT, TILE_WIDTH, textStyle, WALL_HEIGHT } from "../config";
import { CatActor } from "../entities/CatActor";
import { gridToScreen } from "../isometric";
import { furniturePresentation } from "../presentation/furniturePresentation";
import { FurnitureView } from "./FurnitureView";

type RoomViewOptions = {
  getFurniture: () => PlacedFurniture[];
  onPlace: (command: PlacementCommand) => PlacementResult;
  onRemove: (instanceId: string) => boolean;
  onToast: (message: string) => void;
};

export class RoomView extends Container {
  private readonly wallLayer = new Container();
  private readonly floorLayer = new Container();
  private readonly entityLayer = new Container();
  private readonly selectionLayer = new Container();
  private readonly getFurniture: RoomViewOptions["getFurniture"];
  private readonly onPlace: RoomViewOptions["onPlace"];
  private readonly onRemove: RoomViewOptions["onRemove"];
  private readonly onToast: RoomViewOptions["onToast"];
  private readonly cat: CatActor;
  private editMode = false;
  private selectedFurniture: FurnitureKind | null = null;
  private placementRotation: 0 | 1 = 0;
  private hoveredCell: { x: number; y: number } | null = null;
  private catBubble: Container | null = null;
  private catBubbleTimer = 0;

  constructor(options: RoomViewOptions) {
    super();
    this.getFurniture = options.getFurniture;
    this.onPlace = options.onPlace;
    this.onRemove = options.onRemove;
    this.onToast = options.onToast;
    this.entityLayer.sortableChildren = true;
    this.addChild(this.wallLayer, this.floorLayer, this.entityLayer, this.selectionLayer);

    this.drawWalls();
    this.drawFloor();
    this.rebuildFurniture();

    this.cat = new CatActor({
      project: (x, y) => this.project(x, y),
      canWalk: (x, y) => this.isAreaFree(x, y, 1, 1),
      onTap: () => this.showCatBubble(),
    });
    this.entityLayer.addChild(this.cat);
  }

  update(deltaSeconds: number): void {
    this.cat.update(deltaSeconds);
    if (this.catBubble) {
      this.catBubble.position.set(this.cat.x, this.cat.y - 80);
    }
  }

  setPlacementMode(editMode: boolean, selected: FurnitureKind | null, rotation: 0 | 1): void {
    this.editMode = editMode;
    this.selectedFurniture = selected;
    this.placementRotation = rotation;
    this.cat.setPaused(editMode);
    if (!editMode) {
      this.hoveredCell = null;
    }
    this.updateSelection();
  }

  syncFurniture(): void {
    this.rebuildFurniture();
    this.updateSelection();
  }

  private project(x: number, y: number) {
    return gridToScreen({ tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT }, x, y);
  }

  private drawWalls(): void {
    const origin = this.project(0, 0);
    const right = this.project(ROOM_GRID_WIDTH, 0);
    const left = this.project(0, ROOM_GRID_HEIGHT);

    this.wallLayer.addChild(
      new Graphics()
        .poly([origin.x, origin.y, right.x, right.y, right.x, right.y - WALL_HEIGHT, origin.x, origin.y - WALL_HEIGHT])
        .fill(0xf3dec0)
        .stroke({ color: 0x5b402e, width: 4, join: "round" }),
      new Graphics()
        .poly([origin.x, origin.y, left.x, left.y, left.x, left.y - WALL_HEIGHT, origin.x, origin.y - WALL_HEIGHT])
        .fill(0xead0a9)
        .stroke({ color: 0x5b402e, width: 4, join: "round" }),
    );

    for (let index = 1; index < ROOM_GRID_WIDTH; index += 2) {
      const point = this.project(index, 0);
      this.wallLayer.addChild(
        new Graphics()
          .moveTo(point.x, point.y - WALL_HEIGHT)
          .lineTo(point.x, point.y)
          .stroke({ color: 0xddbd93, width: 2, alpha: 0.55 }),
      );
    }

    const windowFrame = new Container();
    const windowPosition = this.project(6.5, 0);
    windowFrame.position.set(windowPosition.x, windowPosition.y - 148);
    windowFrame.addChild(
      new Graphics()
        .roundRect(-78, -42, 156, 105, 8)
        .fill(0xa9d7df)
        .stroke({ color: 0x684732, width: 8 })
        .moveTo(0, -40)
        .lineTo(0, 60)
        .moveTo(-76, 12)
        .lineTo(76, 12)
        .stroke({ color: 0x684732, width: 5 }),
    );
    this.wallLayer.addChild(windowFrame);

    const shelf = this.project(2, 0);
    this.wallLayer.addChild(
      new Graphics()
        .moveTo(shelf.x - 62, shelf.y - 104)
        .lineTo(shelf.x + 62, shelf.y - 74)
        .stroke({ color: 0x70452a, width: 12, cap: "round" }),
    );
  }

  private drawFloor(): void {
    for (let x = 0; x < ROOM_GRID_WIDTH; x += 1) {
      for (let y = 0; y < ROOM_GRID_HEIGHT; y += 1) {
        const point = this.project(x, y);
        const tile = this.drawDiamond(point.x, point.y)
          .fill((x + y) % 2 === 0 ? 0xdca66e : 0xd39a62)
          .stroke({ color: 0xb97948, width: 1.5, alpha: 0.7 });
        tile.eventMode = "static";
        tile.cursor = "pointer";
        tile.on("pointerover", () => {
          this.hoveredCell = { x, y };
          this.updateSelection();
        });
        tile.on("pointerout", () => {
          if (this.hoveredCell?.x === x && this.hoveredCell.y === y) {
            this.hoveredCell = null;
            this.updateSelection();
          }
        });
        tile.on("pointertap", () => this.handleFloorTap(x, y));
        this.floorLayer.addChild(tile);
      }
    }
  }

  private rebuildFurniture(): void {
    for (const child of [...this.entityLayer.children]) {
      if (child.label.startsWith("furniture:")) {
        this.entityLayer.removeChild(child);
        child.destroy({ children: true });
      }
    }

    for (const item of this.getFurniture()) {
      this.entityLayer.addChild(
        new FurnitureView({
          item,
          project: (x, y) => this.project(x, y),
          onTap: (placed) => this.handleFurnitureTap(placed),
        }),
      );
    }
  }

  private handleFurnitureTap(item: PlacedFurniture): void {
    const presentation = furniturePresentation[item.kind];
    const itemLabel = message(presentation.labelMessage);
    if (!this.editMode) {
      this.onToast(message("furniture.description", { item: itemLabel }));
      return;
    }
    if (this.onRemove(item.id)) {
      this.onToast(message("furniture.stored", { item: itemLabel }));
    }
  }

  private handleFloorTap(x: number, y: number): void {
    if (!this.editMode || !this.selectedFurniture) {
      return;
    }
    const definition = furnitureDefinitions[this.selectedFurniture];
    const presentation = furniturePresentation[this.selectedFurniture];
    const size = rotatedSize(definition, this.placementRotation);
    if (!this.isAreaFree(x, y, size.width, size.height)) {
      this.onToast(message("furniture.invalidPlacement"));
      return;
    }

    const result = this.onPlace({
      kind: this.selectedFurniture,
      x,
      y,
      rotation: this.placementRotation,
    });
    if (!result.ok) {
      this.onToast(message(result.reason === "outside-room" ? "furniture.outsideRoom" : "furniture.invalidPlacement"));
      return;
    }
    this.onToast(
      message("furniture.placed", {
        item: message(presentation.labelMessage),
      }),
    );
  }

  private isAreaFree(x: number, y: number, width: number, height: number): boolean {
    return isPlacementFree(this.getFurniture(), ROOM_GRID_WIDTH, ROOM_GRID_HEIGHT, x, y, width, height);
  }

  private updateSelection(): void {
    this.selectionLayer.removeChildren().forEach((child) => {
      child.destroy();
    });
    if (!this.editMode || !this.selectedFurniture || !this.hoveredCell) {
      return;
    }
    const definition = furnitureDefinitions[this.selectedFurniture];
    const size = rotatedSize(definition, this.placementRotation);
    const valid = this.isAreaFree(this.hoveredCell.x, this.hoveredCell.y, size.width, size.height);

    for (let dx = 0; dx < size.width; dx += 1) {
      for (let dy = 0; dy < size.height; dy += 1) {
        const x = this.hoveredCell.x + dx;
        const y = this.hoveredCell.y + dy;
        if (x >= ROOM_GRID_WIDTH || y >= ROOM_GRID_HEIGHT) {
          continue;
        }
        const point = this.project(x, y);
        this.selectionLayer.addChild(
          this.drawDiamond(point.x, point.y)
            .fill({ color: valid ? 0x7ec57e : 0xd96e62, alpha: 0.42 })
            .stroke({ color: valid ? 0x376e43 : 0x8b322c, width: 3 }),
        );
      }
    }
  }

  private drawDiamond(x: number, y: number): Graphics {
    return new Graphics().poly([
      x,
      y,
      x + TILE_WIDTH / 2,
      y + TILE_HEIGHT / 2,
      x,
      y + TILE_HEIGHT,
      x - TILE_WIDTH / 2,
      y + TILE_HEIGHT / 2,
    ]);
  }

  private showCatBubble(): void {
    if (this.catBubble) {
      this.removeCatBubble();
    }
    this.catBubble = new Container();
    this.catBubble.addChild(
      new Graphics()
        .roundRect(-118, -68, 236, 58, 22)
        .fill(0xffffff)
        .stroke({ color: 0x553a2b, width: 4 })
        .poly([-18, -12, 3, 10, 15, -12])
        .fill(0xffffff)
        .stroke({ color: 0x553a2b, width: 3 }),
    );
    const label = new Text({ text: message("cat.studyInvitation"), style: textStyle(17) });
    label.anchor.set(0.5);
    label.position.set(0, -40);
    this.catBubble.addChild(label);
    this.catBubble.position.set(this.cat.x, this.cat.y - 80);
    this.catBubble.zIndex = 10000;
    this.entityLayer.addChild(this.catBubble);
    window.clearTimeout(this.catBubbleTimer);
    this.catBubbleTimer = window.setTimeout(() => this.removeCatBubble(), 2600);
  }

  private removeCatBubble(): void {
    if (!this.catBubble) {
      return;
    }
    this.entityLayer.removeChild(this.catBubble);
    this.catBubble.destroy({ children: true });
    this.catBubble = null;
  }
}
