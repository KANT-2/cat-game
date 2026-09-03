import { Container, Graphics, Sprite, Text } from "pixi.js";
import { message } from "../../content/messages";
import type { MoveFurnitureCommand, PlacementCommand, PlacementResult } from "../../core/GameClient";
import type { CatVariant } from "../../domain/cats";
import {
  type FurnitureKind,
  furnitureDefinitions,
  isPlacementFree,
  type PlacedFurniture,
  ROOM_GRID_HEIGHT,
  ROOM_GRID_WIDTH,
  rotatedSize,
} from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import { shopItemDefinitions } from "../../domain/shop";
import { gridCellPolygon, gridToScreen, screenToGrid } from "../belt";
import { CLEARING_GRID, textStyle } from "../config";
import { CatActor, type CatDropTarget } from "../entities/CatActor";
import type { CatAction, CatAnimationLibrary } from "../entities/CatAnimations";
import { furniturePresentation } from "../presentation/furniturePresentation";
import type { ForestArt } from "./ForestArt";
import { FurnitureView } from "./FurnitureView";

type ForestClearingViewOptions = {
  getFurniture: () => PlacedFurniture[];
  onPlace: (command: PlacementCommand) => PlacementResult;
  onMove: (instanceId: string, command: MoveFurnitureCommand) => PlacementResult;
  onSelectFurniture: (item: PlacedFurniture) => void;
  onToast: (message: string) => void;
  getHomeCats: () => CatVariant[];
  getActiveCat: () => CatVariant;
  getActiveWallpaper: () => ShopItemId | null;
  getActiveFloor: () => ShopItemId | null;
  catAnimations: CatAnimationLibrary;
  art: ForestArt;
};

const INITIAL_CAT_ACTIONS = [
  "idle",
  "groom",
  "scratch",
  "sleep",
  "surprise",
  "jump",
] as const satisfies readonly CatAction[];
const PREFERRED_SPAWN_MIN_X = 1;
const PREFERRED_SPAWN_MAX_X = ROOM_GRID_WIDTH - 2;
const PREFERRED_SPAWN_MIN_Y = 2;
const PREFERRED_SPAWN_MAX_Y = 5;

export class ForestClearingView extends Container {
  private readonly backgroundLayer = new Container({ label: "forest-background" });
  private readonly groundHitLayer = new Container({ label: "forest-ground-input" });
  private readonly themeLayer = new Container({ label: "forest-room-theme" });
  private readonly gridLayer = new Container({ label: "forest-edit-grid" });
  private readonly selectionLayer = new Container({ label: "forest-selection" });
  private readonly catDropLayer = new Container({ label: "forest-cat-drop" });
  private readonly entityLayer = new Container({ label: "forest-entities" });
  private readonly foregroundLayer = new Container({ label: "forest-foreground" });
  private readonly getFurniture: ForestClearingViewOptions["getFurniture"];
  private readonly onPlace: ForestClearingViewOptions["onPlace"];
  private readonly onMove: ForestClearingViewOptions["onMove"];
  private readonly onSelectFurniture: ForestClearingViewOptions["onSelectFurniture"];
  private readonly onToast: ForestClearingViewOptions["onToast"];
  private readonly getHomeCats: ForestClearingViewOptions["getHomeCats"];
  private readonly getActiveCat: ForestClearingViewOptions["getActiveCat"];
  private readonly getActiveWallpaper: ForestClearingViewOptions["getActiveWallpaper"];
  private readonly getActiveFloor: ForestClearingViewOptions["getActiveFloor"];
  private readonly catAnimations: CatAnimationLibrary;
  private readonly art: ForestArt;
  private readonly cats = new Map<CatVariant, CatActor>();
  private readonly initialActions = shuffled(INITIAL_CAT_ACTIONS);
  private activeCatVariant: CatVariant | null = null;
  private editMode = false;
  private selectedFurniture: FurnitureKind | null = null;
  private placementRotation: 0 | 1 = 0;
  private movingInstanceId: string | null = null;
  private selectedShopItemId: PlacementCommand["shopItemId"];
  private hoveredCell: { x: number; y: number } | null = null;
  private catBubble: Container | null = null;
  private catBubbleTarget: CatActor | null = null;
  private catBubbleTimer = 0;

  constructor(options: ForestClearingViewOptions) {
    super({ label: "forest-clearing" });
    this.getFurniture = options.getFurniture;
    this.onPlace = options.onPlace;
    this.onMove = options.onMove;
    this.onSelectFurniture = options.onSelectFurniture;
    this.onToast = options.onToast;
    this.getHomeCats = options.getHomeCats;
    this.getActiveCat = options.getActiveCat;
    this.getActiveWallpaper = options.getActiveWallpaper;
    this.getActiveFloor = options.getActiveFloor;
    this.catAnimations = options.catAnimations;
    this.art = options.art;
    this.entityLayer.sortableChildren = true;
    this.addChild(
      this.backgroundLayer,
      this.themeLayer,
      this.groundHitLayer,
      this.gridLayer,
      this.selectionLayer,
      this.catDropLayer,
      this.entityLayer,
      this.foregroundLayer,
    );

    this.drawForest();
    this.syncTheme();
    this.buildGroundGrid();
    this.rebuildFurniture();
    this.syncCats();
  }

  update(deltaSeconds: number): void {
    for (const cat of this.cats.values()) {
      cat.update(deltaSeconds);
    }
    if (this.catBubble && this.catBubbleTarget) {
      this.catBubble.position.set(this.catBubbleTarget.x, this.catBubbleTarget.y - 130);
    }
  }

  setPlacementMode(
    editMode: boolean,
    selected: FurnitureKind | null,
    rotation: 0 | 1,
    movingInstanceId: string | null = null,
    shopItemId?: PlacementCommand["shopItemId"],
  ): void {
    this.editMode = editMode;
    this.selectedFurniture = selected;
    this.placementRotation = rotation;
    this.movingInstanceId = movingInstanceId;
    this.selectedShopItemId = shopItemId;
    this.gridLayer.visible = editMode;
    for (const cat of this.cats.values()) {
      cat.setPaused(editMode);
    }
    if (!editMode) {
      this.hoveredCell = null;
    }
    this.updateSelection();
  }

  syncFurniture(): void {
    this.rebuildFurniture();
    this.updateSelection();
  }

  /**
   * 저장 상태의 홈 고양이 목록과 공터에 표시되는 고양이 배우를 일치시킨다.
   *
   * @remarks 기존 배우의 위치와 행동은 유지하고 새로 배치되거나 보관된 고양이만 추가·제거한다.
   */
  syncCats(): void {
    const homeCats = this.getHomeCats();
    for (const [variant, cat] of this.cats) {
      if (homeCats.includes(variant)) {
        continue;
      }
      if (this.catBubbleTarget === cat) {
        this.removeCatBubble();
      }
      this.cats.delete(variant);
      this.entityLayer.removeChild(cat);
      cat.destroy({ children: true });
      if (this.activeCatVariant === variant) {
        this.activeCatVariant = null;
      }
    }

    homeCats.forEach((variant, index) => {
      if (this.cats.has(variant)) {
        return;
      }
      const spawn = this.findCatSpawn(index);
      const cat = new CatActor({
        project: (x, y) => this.project(x, y),
        unproject: (x, y) => screenToGrid(CLEARING_GRID, x, y),
        canWalk: (x, y) => this.canCatWalk(variant, x, y),
        onFocusRequest: () => {
          this.activeCatVariant = variant;
        },
        onLiftStart: () => {
          this.activeCatVariant = variant;
          this.removeCatBubble();
        },
        onDragTargetChange: (target) => this.updateCatDropTarget(target),
        onTap: () => this.showCatBubble(cat),
        animations: this.catAnimations[variant],
        initialGridX: spawn.x,
        initialGridY: spawn.y,
        initialFacing: Math.random() < 0.5 ? "left" : "right",
        initialAction: this.initialActions[index] ?? "idle",
        label: `cat:${variant}`,
      });
      cat.setPaused(this.editMode);
      this.cats.set(variant, cat);
      this.entityLayer.addChild(cat);
      this.activeCatVariant ??= variant;
    });
    const selectedVariant = this.getActiveCat();
    if (this.cats.has(selectedVariant)) {
      this.activeCatVariant = selectedVariant;
    }
  }

  private project(x: number, y: number) {
    return gridToScreen(CLEARING_GRID, x, y);
  }

  /** 선택한 벽지·바닥재의 색감을 야외 홈 배경과 공터에 즉시 반영한다. */
  syncTheme(): void {
    this.themeLayer.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    const wallpaper = this.getActiveWallpaper();
    const floor = this.getActiveFloor();
    if (wallpaper) {
      const item = shopItemDefinitions[wallpaper];
      if (item.kind === "wallpaper") {
        this.themeLayer.addChild(new Graphics().rect(0, 0, 1600, 410).fill({ color: item.themeColor, alpha: 0.26 }));
      }
    }
    if (floor) {
      const item = shopItemDefinitions[floor];
      if (item.kind === "floor") {
        this.themeLayer.addChild(
          new Graphics()
            .poly([
              CLEARING_GRID.centerX - CLEARING_GRID.farWidth / 2,
              CLEARING_GRID.farY,
              CLEARING_GRID.centerX + CLEARING_GRID.farWidth / 2,
              CLEARING_GRID.farY,
              CLEARING_GRID.centerX + CLEARING_GRID.nearWidth / 2,
              CLEARING_GRID.nearY,
              CLEARING_GRID.centerX - CLEARING_GRID.nearWidth / 2,
              CLEARING_GRID.nearY,
            ])
            .fill({ color: item.themeColor, alpha: 0.38 })
            .stroke({ color: item.themeColor, alpha: 0.7, width: 5 }),
        );
      }
    }
  }
  private drawForest(): void {
    const background = new Sprite(this.art.background);
    background.width = 1600;
    background.height = 900;
    this.backgroundLayer.addChild(background);
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
          art: this.art.furniture[item.kind],
          project: (x, y) => this.project(x, y),
          onTap: (placed) => this.handleFurnitureTap(placed),
        }),
      );
    }
  }

  private handleFurnitureTap(item: PlacedFurniture): void {
    if (!this.editMode) {
      this.onSelectFurniture(item);
      return;
    }
    this.onToast(message("furniture.finishCurrentPlacement"));
  }

  private handleGroundTap(x: number, y: number): void {
    if (!this.editMode) {
      const activeVariant = this.activeCatVariant ?? this.getActiveCat();
      const activeCat = this.cats.get(activeVariant) ?? this.cats.values().next().value;
      activeCat?.walkTo(x, y);
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

    const result = this.movingInstanceId
      ? this.onMove(this.movingInstanceId, { x, y, rotation: this.placementRotation })
      : this.onPlace({
          kind: this.selectedFurniture,
          x,
          y,
          rotation: this.placementRotation,
          shopItemId: this.selectedShopItemId,
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
    const furniture = this.movingInstanceId
      ? this.getFurniture().filter((item) => item.id !== this.movingInstanceId)
      : this.getFurniture();
    return isPlacementFree(furniture, ROOM_GRID_WIDTH, ROOM_GRID_HEIGHT, x, y, width, height);
  }

  private canCatWalk(variant: CatVariant, x: number, y: number): boolean {
    if (!this.isAreaFree(x, y, 1, 1)) {
      return false;
    }
    return ![...this.cats].some(([otherVariant, cat]) => otherVariant !== variant && cat.reservesCell(x, y));
  }

  private findCatSpawn(index: number): { x: number; y: number } {
    const preferred = this.pickAvailableInitialCell(
      PREFERRED_SPAWN_MIN_X,
      PREFERRED_SPAWN_MAX_X,
      PREFERRED_SPAWN_MIN_Y,
      PREFERRED_SPAWN_MAX_Y,
    );
    if (preferred) {
      return preferred;
    }
    const anywhere = this.pickAvailableInitialCell(0, ROOM_GRID_WIDTH - 1, 0, ROOM_GRID_HEIGHT - 1);
    if (anywhere) {
      return anywhere;
    }
    return { x: index % ROOM_GRID_WIDTH, y: Math.floor(index / ROOM_GRID_WIDTH) };
  }

  private pickAvailableInitialCell(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
  ): { x: number; y: number } | null {
    const available: { x: number; y: number }[] = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const occupiedByCat = [...this.cats.values()].some((cat) => cat.reservesCell(x, y));
        if (!occupiedByCat && this.isAreaFree(x, y, 1, 1)) {
          available.push({ x, y });
        }
      }
    }
    if (available.length === 0) {
      return null;
    }
    return available[Math.floor(Math.random() * available.length)] ?? null;
  }

  private updateCatDropTarget(target: CatDropTarget | null): void {
    this.catDropLayer.removeChildren().forEach((child) => {
      child.destroy();
    });
    if (!target || target.x < 0 || target.y < 0 || target.x >= ROOM_GRID_WIDTH || target.y >= ROOM_GRID_HEIGHT) {
      return;
    }
    this.catDropLayer.addChild(
      new Graphics()
        .poly(gridCellPolygon(CLEARING_GRID, target.x, target.y))
        .fill({ color: target.valid ? 0x78c96f : 0xd96e62, alpha: 0.5 })
        .stroke({ color: target.valid ? 0x315f3a : 0x8b322c, width: 3 }),
    );
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

  private showCatBubble(cat: CatActor): void {
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
    this.catBubbleTarget = cat;
    this.catBubble.position.set(cat.x, cat.y - 90);
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
    this.catBubbleTarget = null;
  }
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}
