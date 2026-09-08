import { Container, type FederatedPointerEvent, Graphics, Text } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import type { FurnitureKind } from "../../domain/room";
import type { ShopItemId } from "../../domain/shop";
import { textStyle } from "../config";
import type { FurnitureArtCollection } from "../forest/ForestArt";
import { resolveFurnitureArt } from "../forest/ForestArt";
import { createFurniturePreview } from "../forest/FurniturePreview";
import type { OwnedFurnitureEntry } from "../presentation/ownedFurniture";
import { CanvasButton } from "./CanvasButton";

type PlacementTrayOptions = {
  entries: OwnedFurnitureEntry[];
  page: number;
  selectedKind: FurnitureKind | null;
  selectedItemId?: ShopItemId;
  moving: boolean;
  furnitureArt: FurnitureArtCollection;
  onSelect: (entry: OwnedFurnitureEntry) => void;
  onPageChange: (page: number) => void;
  onRotate: () => void;
  onCancelPlacement: () => void;
  onFinish: () => void;
};

export const PLACEMENT_TRAY_WIDTH = 1_420;
export const PLACEMENT_TRAY_HEIGHT = 190;
const ITEMS_PER_PAGE = 5;

/** 보유 가구를 화면 전환 없이 연속 선택하는 홈 배치 모드 트레이다. */
export class PlacementTray extends Container {
  constructor(options: PlacementTrayOptions) {
    super({ label: "placement-tray" });
    const available = options.entries.filter((entry) => entry.stored > 0);
    const pageCount = Math.max(1, Math.ceil(available.length / ITEMS_PER_PAGE));
    const page = Math.max(0, Math.min(options.page, pageCount - 1));
    const activePlacement = options.selectedKind !== null;
    let guideMessage: MessageId = "placement.trayGuide";
    if (activePlacement) {
      guideMessage = options.moving ? "placement.movingGuide" : "placement.placingGuide";
    }
    this.addChild(
      new Graphics()
        .roundRect(0, 7, PLACEMENT_TRAY_WIDTH, PLACEMENT_TRAY_HEIGHT, 26)
        .fill({ color: 0x3d281d, alpha: 0.3 })
        .roundRect(0, 0, PLACEMENT_TRAY_WIDTH, PLACEMENT_TRAY_HEIGHT, 26)
        .fill({ color: 0xfff3dc, alpha: 0.97 })
        .stroke({ color: 0x68442f, width: 4 }),
    );

    const title = new Text({ text: message("placement.trayTitle"), style: textStyle(20, 0x493022, "800") });
    title.position.set(24, 15);
    const guide = new Text({
      text: message(guideMessage),
      style: textStyle(14, 0x76533c, "600"),
    });
    guide.position.set(165, 19);
    this.addChild(title, guide);

    if (available.length === 0) {
      const empty = new Text({ text: message("placement.empty"), style: textStyle(17, 0x76533c, "700") });
      empty.position.set(28, 91);
      this.addChild(empty);
    } else {
      available.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE).forEach((entry, index) => {
        this.addChild(this.createItemCard(entry, index, options));
      });
    }

    const pageLabel = new Text({
      text: message("placement.page", { current: page + 1, total: pageCount }),
      style: textStyle(13, 0x76533c, "700"),
    });
    pageLabel.anchor.set(0.5);
    pageLabel.position.set(1_137, 57);
    const previous = new CanvasButton({
      label: message("placement.previous"),
      width: 58,
      height: 45,
      fontSize: 24,
      disabled: page === 0,
      color: page === 0 ? 0xc9baa8 : 0xe2c29c,
      onPress: () => options.onPageChange(page - 1),
    });
    previous.position.set(1_072, 76);
    const next = new CanvasButton({
      label: message("placement.next"),
      width: 58,
      height: 45,
      fontSize: 24,
      disabled: page >= pageCount - 1,
      color: page >= pageCount - 1 ? 0xc9baa8 : 0xe2c29c,
      onPress: () => options.onPageChange(page + 1),
    });
    next.position.set(1_142, 76);
    this.addChild(pageLabel, previous, next);

    if (activePlacement) {
      const rotate = new CanvasButton({
        label: message("shop.rotatePlacement"),
        width: 92,
        height: 45,
        fontSize: 14,
        color: 0x91aa82,
        onPress: options.onRotate,
      });
      rotate.position.set(1_220, 49);
      const cancel = new CanvasButton({
        label: message("placement.cancelSelection"),
        width: 92,
        height: 45,
        fontSize: 14,
        color: 0xd7ad7e,
        onPress: options.onCancelPlacement,
      });
      cancel.position.set(1_220, 104);
      this.addChild(rotate, cancel);
    }

    const finish = new CanvasButton({
      label: message("furniture.finishEditMode"),
      width: 86,
      height: 100,
      fontSize: 16,
      color: 0xe9a14b,
      onPress: options.onFinish,
    });
    finish.position.set(1_318, 49);
    this.addChild(finish);
  }

  private createItemCard(entry: OwnedFurnitureEntry, index: number, options: PlacementTrayOptions): Container {
    const card = new Container();
    const x = 24 + index * 208;
    const selected =
      options.selectedKind === entry.kind &&
      (options.selectedItemId === entry.itemId || (!options.selectedItemId && !entry.itemId));
    const background = new Graphics()
      .roundRect(0, 0, 194, 108, 17)
      .fill(selected ? 0xdde9c9 : 0xffe9c7)
      .stroke({ color: selected ? 0x6d8d59 : 0xb77a4f, width: selected ? 4 : 2 });
    const art = createFurniturePreview(resolveFurnitureArt(options.furnitureArt, entry.kind, entry.itemId), 78, 78);
    art.position.set(48, 54);
    const name = new Text({ text: message(entry.name), style: textStyle(14, 0x493022, "800") });
    name.position.set(92, 23);
    if (name.width > 90) {
      name.scale.set(90 / name.width);
    }
    const count = new Text({
      text: message("placement.count", { count: entry.stored }),
      style: textStyle(13, 0x76533c, "700"),
    });
    count.position.set(92, 61);
    card.addChild(background, art, name, count);
    card.position.set(x, 63);
    card.eventMode = "static";
    card.cursor = "pointer";
    card.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onSelect(entry);
    });
    return card;
  }
}
