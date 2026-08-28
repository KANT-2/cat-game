import { Container, type FederatedPointerEvent, Graphics, type Point } from "pixi.js";
import { furnitureDefinitions, type PlacedFurniture, rotatedSize } from "../../domain/room";
import { furniturePresentation } from "../presentation/furniturePresentation";

type FurnitureViewOptions = {
  item: PlacedFurniture;
  project: (x: number, y: number) => Point;
  onTap: (item: PlacedFurniture) => void;
};

export class FurnitureView extends Container {
  constructor({ item, project, onTap }: FurnitureViewOptions) {
    super({ label: `furniture:${item.id}` });
    const definition = furnitureDefinitions[item.kind];
    const presentation = furniturePresentation[item.kind];
    const size = rotatedSize(definition, item.rotation);
    const center = project(item.x + size.width / 2, item.y + size.height / 2);
    this.position.set(center.x, center.y + 4);
    this.zIndex = Math.round((item.x + size.width + item.y + size.height) * 100);
    this.eventMode = "static";
    this.cursor = "pointer";

    const shadowWidth = Math.max(42, (size.width + size.height) * 30);
    this.addChild(new Graphics().ellipse(0, 17, shadowWidth, 17).fill({ color: 0x4c3426, alpha: 0.22 }));

    if (item.kind === "plant") {
      this.addChild(drawPlant(presentation.color, presentation.accent));
    }
    if (item.kind === "catTree") {
      this.addChild(drawCatTree(presentation.color, presentation.accent));
    }
    if (item.kind === "bed") {
      this.addChild(drawBed(presentation.color, presentation.accent));
    }
    if (item.kind === "desk") {
      this.addChild(drawDesk(presentation.color, presentation.accent));
    }
    if (item.kind === "sofa") {
      this.addChild(drawSofa(presentation.color, presentation.accent));
    }

    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      onTap(item);
    });
  }
}

function drawPlant(color: number, accent: number): Graphics {
  return new Graphics()
    .poly([-17, -4, 17, -4, 11, 28, -11, 28])
    .fill(accent)
    .stroke({ color: 0x513725, width: 3 })
    .ellipse(-9, -20, 12, 25)
    .ellipse(10, -25, 13, 30)
    .ellipse(0, -39, 12, 27)
    .fill(color)
    .stroke({ color: 0x36573a, width: 2 });
}

function drawCatTree(color: number, accent: number): Graphics {
  return new Graphics()
    .rect(-35, -75, 12, 89)
    .rect(25, -112, 12, 126)
    .fill(color)
    .ellipse(-29, -75, 44, 13)
    .ellipse(31, -112, 46, 14)
    .fill(accent)
    .stroke({ color: 0x68452e, width: 3 });
}

function drawBed(color: number, accent: number): Graphics {
  return new Graphics()
    .roundRect(-105, -43, 210, 75, 14)
    .fill(color)
    .stroke({ color: 0x68452e, width: 4 })
    .roundRect(-86, -34, 65, 32, 12)
    .fill(0xf8ead1)
    .roundRect(-12, -30, 98, 51, 12)
    .fill(accent);
}

function drawDesk(color: number, accent: number): Graphics {
  return new Graphics()
    .roundRect(-74, -51, 148, 38, 7)
    .fill(accent)
    .stroke({ color: 0x5d3b28, width: 4 })
    .rect(-62, -15, 10, 45)
    .rect(52, -15, 10, 45)
    .fill(color)
    .roundRect(-24, -90, 51, 36, 5)
    .fill(0x50656a)
    .stroke({ color: 0x3d3028, width: 4 });
}

function drawSofa(color: number, accent: number): Graphics {
  return new Graphics()
    .roundRect(-100, -52, 200, 76, 18)
    .fill(color)
    .stroke({ color: 0x5d3b28, width: 4 })
    .roundRect(-94, -83, 188, 49, 18)
    .fill(accent)
    .stroke({ color: 0x5d3b28, width: 4 })
    .moveTo(-30, -48)
    .lineTo(-30, 18)
    .moveTo(35, -48)
    .lineTo(35, 18)
    .stroke({ color: 0x705039, width: 3, alpha: 0.7 });
}
