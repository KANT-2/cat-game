import { Container, type FederatedPointerEvent, Graphics, type Point } from "pixi.js";

type CatActorOptions = {
  project: (x: number, y: number) => Point;
  canWalk: (x: number, y: number) => boolean;
  onTap: () => void;
};

export class CatActor extends Container {
  gridX = 4;
  gridY = 4;
  private targetX = 4;
  private targetY = 4;
  private wait = 1.5;
  private paused = false;
  private readonly projectGrid: CatActorOptions["project"];
  private readonly canWalk: CatActorOptions["canWalk"];

  constructor(options: CatActorOptions) {
    super({ label: "cat" });
    this.projectGrid = options.project;
    this.canWalk = options.canWalk;
    this.zIndex = 999;
    this.eventMode = "static";
    this.cursor = "pointer";
    this.addChild(drawCat());
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      if (!this.paused) {
        options.onTap();
      }
    });
    this.syncPosition();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.rotation = 0;
  }

  update(deltaSeconds: number): void {
    if (this.paused) {
      return;
    }
    const distance = Math.hypot(this.targetX - this.gridX, this.targetY - this.gridY);
    if (distance > 0.02) {
      const speed = Math.min(distance, deltaSeconds * 1.15);
      this.gridX += ((this.targetX - this.gridX) / distance) * speed;
      this.gridY += ((this.targetY - this.gridY) / distance) * speed;
      this.scale.x = this.targetX < this.gridX ? -1 : 1;
      this.rotation = Math.sin(performance.now() / 85) * 0.025;
      this.syncPosition();
      return;
    }

    this.rotation = 0;
    this.wait -= deltaSeconds;
    if (this.wait <= 0) {
      this.chooseTarget();
    }
  }

  private chooseTarget(): void {
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    const shuffled = [...directions].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of shuffled) {
      const nextX = Math.round(this.gridX) + dx;
      const nextY = Math.round(this.gridY) + dy;
      if (this.canWalk(nextX, nextY)) {
        this.targetX = nextX;
        this.targetY = nextY;
        this.wait = 1.5 + Math.random() * 2.5;
        return;
      }
    }
    this.wait = 1;
  }

  private syncPosition(): void {
    const point = this.projectGrid(this.gridX + 0.5, this.gridY + 0.5);
    this.position.set(point.x, point.y + 19);
    this.zIndex = Math.round((this.gridX + this.gridY + 1) * 100 + 20);
  }
}

function drawCat(): Graphics {
  return new Graphics()
    .ellipse(0, 20, 31, 11)
    .fill({ color: 0x4c3426, alpha: 0.2 })
    .ellipse(-4, -4, 31, 25)
    .fill(0xd67a35)
    .stroke({ color: 0x4e3426, width: 3 })
    .circle(13, -28, 22)
    .fill(0xe28a3e)
    .stroke({ color: 0x4e3426, width: 3 })
    .poly([-3, -42, 2, -65, 14, -46])
    .poly([22, -46, 37, -61, 35, -37])
    .fill(0xe28a3e)
    .stroke({ color: 0x4e3426, width: 3 })
    .circle(7, -31, 2.6)
    .circle(21, -31, 2.6)
    .fill(0x36271f)
    .circle(14, -23, 2.5)
    .fill(0x68412e)
    .moveTo(-30, -9)
    .bezierCurveTo(-60, -35, -61, 10, -40, 12)
    .stroke({ color: 0x4e3426, width: 8, cap: "round" })
    .moveTo(-17, -11)
    .lineTo(-5, -5)
    .moveTo(-16, -2)
    .lineTo(-3, 3)
    .stroke({ color: 0x8d4e2d, width: 4, cap: "round" });
}
