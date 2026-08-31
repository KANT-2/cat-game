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
import { gridCellPolygon, gridToScreen } from "../belt";
import { CLEARING_GRID, textStyle } from "../config";
import { CatActor } from "../entities/CatActor";
import { furniturePresentation } from "../presentation/furniturePresentation";
import { FurnitureView } from "./FurnitureView";

type ForestClearingViewOptions = {
  getFurniture: () => PlacedFurniture[];
  onPlace: (command: PlacementCommand) => PlacementResult;
  onRemove: (instanceId: string) => boolean;
  onToast: (message: string) => void;
};

export class ForestClearingView extends Container {
  private readonly backgroundLayer = new Container({ label: "forest-background" });
  private readonly groundHitLayer = new Container({ label: "forest-ground-input" });
  private readonly gridLayer = new Container({ label: "forest-edit-grid" });
  private readonly selectionLayer = new Container({ label: "forest-selection" });
  private readonly entityLayer = new Container({ label: "forest-entities" });
  private readonly foregroundLayer = new Container({ label: "forest-foreground" });
  private readonly getFurniture: ForestClearingViewOptions["getFurniture"];
  private readonly onPlace: ForestClearingViewOptions["onPlace"];
  private readonly onRemove: ForestClearingViewOptions["onRemove"];
  private readonly onToast: ForestClearingViewOptions["onToast"];
  private readonly cat: CatActor;
  private editMode = false;
  private selectedFurniture: FurnitureKind | null = null;
  private placementRotation: 0 | 1 = 0;
  private hoveredCell: { x: number; y: number } | null = null;
  private catBubble: Container | null = null;
  private catBubbleTimer = 0;

  constructor(options: ForestClearingViewOptions) {
    super({ label: "forest-clearing" });
    this.getFurniture = options.getFurniture;
    this.onPlace = options.onPlace;
    this.onRemove = options.onRemove;
    this.onToast = options.onToast;
    this.entityLayer.sortableChildren = true;
    this.addChild(
      this.backgroundLayer,
      this.groundHitLayer,
      this.gridLayer,
      this.selectionLayer,
      this.entityLayer,
      this.foregroundLayer,
    );

    this.drawForest();
    this.buildGroundGrid();
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
      this.catBubble.position.set(this.cat.x, this.cat.y - 90);
    }
  }

  setPlacementMode(editMode: boolean, selected: FurnitureKind | null, rotation: 0 | 1): void {
    this.editMode = editMode;
    this.selectedFurniture = selected;
    this.placementRotation = rotation;
    this.gridLayer.visible = editMode;
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
    return gridToScreen(CLEARING_GRID, x, y);
  }

  private drawForest(): void {
    this.backgroundLayer.addChild(
      new Graphics().rect(0, 0, 1600, 900).fill(0xcdf0df).rect(0, 250, 1600, 650).fill(0x89bd66),
      drawCloud(310, 92, 1.2),
      drawCloud(1130, 120, 0.9),
      new Graphics()
        .poly([0, 330, 160, 185, 315, 324, 500, 155, 690, 330, 880, 175, 1080, 320, 1280, 145, 1600, 330])
        .fill({ color: 0x6ea968, alpha: 0.72 }),
    );

    const distantTrees = [90, 240, 420, 585, 770, 955, 1130, 1320, 1510];
    for (const [index, x] of distantTrees.entries()) {
      this.backgroundLayer.addChild(drawPine(x, 315, 0.72 + (index % 3) * 0.08));
    }

    this.backgroundLayer.addChild(
      new Graphics()
        .poly([0, 365, 230, 338, 470, 376, 735, 344, 1000, 370, 1285, 334, 1600, 365, 1600, 475, 0, 475])
        .fill(0x3f7847),
      new Graphics()
        .poly([180, 392, 1420, 392, 1580, 832, 20, 832])
        .fill(0xa7cc69)
        .stroke({ color: 0x628b4f, width: 5 }),
      new Graphics().poly([460, 832, 650, 392, 950, 392, 1150, 832]).fill({ color: 0xc5bf73, alpha: 0.5 }),
      new Graphics()
        .ellipse(800, 540, 390, 65)
        .fill({ color: 0xe2d391, alpha: 0.24 })
        .ellipse(475, 680, 210, 42)
        .fill({ color: 0x789f51, alpha: 0.28 })
        .ellipse(1170, 735, 250, 45)
        .fill({ color: 0x789f51, alpha: 0.24 }),
    );

    const treeSpecs = [
      [75, 410, 1.25],
      [290, 405, 0.9],
      [520, 398, 0.72],
      [1080, 400, 0.75],
      [1320, 405, 0.92],
      [1530, 412, 1.22],
    ] as const;
    for (const [x, y, scale] of treeSpecs) {
      this.backgroundLayer.addChild(drawBroadleafTree(x, y, scale));
    }

    this.backgroundLayer.addChild(
      drawMossyRock(205, 424, 1),
      drawMossyRock(610, 409, 0.62),
      drawMossyRock(1010, 414, 0.7),
      drawMossyRock(1405, 425, 0.94),
    );

    this.foregroundLayer.addChild(
      new Graphics()
        .ellipse(90, 895, 250, 105)
        .ellipse(360, 916, 230, 95)
        .ellipse(1260, 918, 260, 100)
        .ellipse(1515, 890, 220, 110)
        .fill(0x2f6b3e),
      drawGrassCluster(75, 850, 1.35),
      drawGrassCluster(315, 875, 1.05),
      drawGrassCluster(1285, 875, 1.12),
      drawGrassCluster(1530, 842, 1.4),
      drawMossyRock(125, 862, 1.18),
      drawMossyRock(1455, 866, 1.05),
    );
  }

  private buildGroundGrid(): void {
    this.gridLayer.visible = false;
    for (let x = 0; x < ROOM_GRID_WIDTH; x += 1) {
      for (let y = 0; y < ROOM_GRID_HEIGHT; y += 1) {
        const polygon = gridCellPolygon(CLEARING_GRID, x, y);
        const hitCell = new Graphics().poly(polygon).fill({ color: 0xffffff, alpha: 0.001 });
        hitCell.eventMode = "static";
        hitCell.cursor = "pointer";
        hitCell.on("pointerover", () => {
          if (!this.editMode) {
            return;
          }
          this.hoveredCell = { x, y };
          this.updateSelection();
        });
        hitCell.on("pointerout", () => {
          if (this.hoveredCell?.x === x && this.hoveredCell.y === y) {
            this.hoveredCell = null;
            this.updateSelection();
          }
        });
        hitCell.on("pointertap", () => this.handleGroundTap(x, y));
        this.groundHitLayer.addChild(hitCell);

        this.gridLayer.addChild(
          new Graphics()
            .poly(polygon)
            .fill({ color: (x + y) % 2 === 0 ? 0xf6edb5 : 0xb7d989, alpha: 0.12 })
            .stroke({ color: 0xf7f0bd, width: 1.5, alpha: 0.34 }),
        );
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

  private handleGroundTap(x: number, y: number): void {
    if (!this.editMode) {
      this.cat.walkTo(x, y);
      return;
    }
    if (!this.selectedFurniture) {
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
      this.onToast(
        message(result.reason === "outside-room" ? "furniture.outsideClearing" : "furniture.invalidPlacement"),
      );
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
        this.selectionLayer.addChild(
          new Graphics()
            .poly(gridCellPolygon(CLEARING_GRID, x, y))
            .fill({ color: valid ? 0x78c96f : 0xd96e62, alpha: 0.5 })
            .stroke({ color: valid ? 0x315f3a : 0x8b322c, width: 3 }),
        );
      }
    }
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
    this.catBubble.position.set(this.cat.x, this.cat.y - 90);
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

function drawCloud(x: number, y: number, scale: number): Graphics {
  const cloud = new Graphics()
    .ellipse(-48, 4, 58, 25)
    .ellipse(0, -4, 72, 34)
    .ellipse(52, 6, 58, 24)
    .fill({ color: 0xffffff, alpha: 0.72 });
  cloud.position.set(x, y);
  cloud.scale.set(scale);
  return cloud;
}

function drawPine(x: number, groundY: number, scale: number): Graphics {
  const pine = new Graphics()
    .rect(-8, -70, 16, 72)
    .fill(0x50794a)
    .poly([0, -185, -64, -70, 64, -70])
    .poly([0, -145, -78, -30, 78, -30])
    .fill(0x4e8f59);
  pine.position.set(x, groundY);
  pine.scale.set(scale);
  return pine;
}

function drawBroadleafTree(x: number, groundY: number, scale: number): Container {
  const tree = new Container();
  tree.position.set(x, groundY);
  tree.scale.set(scale);
  tree.addChild(
    new Graphics()
      .roundRect(-24, -170, 48, 178, 18)
      .fill(0x775333)
      .stroke({ color: 0x513a2b, width: 5 })
      .moveTo(-6, -105)
      .lineTo(-72, -178)
      .moveTo(10, -124)
      .lineTo(74, -198)
      .stroke({ color: 0x62472f, width: 23, cap: "round" }),
    new Graphics()
      .circle(-78, -206, 76)
      .circle(8, -250, 90)
      .circle(92, -205, 78)
      .circle(5, -177, 86)
      .fill(0x3f8245)
      .stroke({ color: 0x2f6538, width: 6 })
      .circle(-56, -230, 38)
      .circle(44, -265, 44)
      .circle(70, -184, 35)
      .fill({ color: 0x76ad4f, alpha: 0.8 }),
  );
  return tree;
}

function drawMossyRock(x: number, groundY: number, scale: number): Graphics {
  const rock = new Graphics()
    .ellipse(0, 0, 72, 18)
    .fill({ color: 0x284326, alpha: 0.2 })
    .poly([-62, -8, -44, -63, 2, -82, 52, -54, 68, -6])
    .fill(0x879778)
    .stroke({ color: 0x546453, width: 5 })
    .ellipse(-18, -48, 28, 13)
    .ellipse(23, -38, 26, 12)
    .fill(0x6f9a55);
  rock.position.set(x, groundY);
  rock.scale.set(scale);
  return rock;
}

function drawGrassCluster(x: number, groundY: number, scale: number): Graphics {
  const grass = new Graphics()
    .poly([-72, 12, -48, -76, -29, 7, -5, -100, 10, 9, 42, -82, 35, 9, 79, -61, 61, 19])
    .fill(0x3f8548)
    .stroke({ color: 0x2c663b, width: 3, join: "round" });
  grass.position.set(x, groundY);
  grass.scale.set(scale);
  return grass;
}
