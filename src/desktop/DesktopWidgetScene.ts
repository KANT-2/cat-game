import { Container } from "pixi.js";
import type { CatAnimationSet } from "../game/entities/CatAnimations";
import { DesktopCatActor } from "./DesktopCatActor";

type DesktopWidgetSceneOptions = {
  animations: CatAnimationSet;
  onFocusRequest: () => void;
  onInputLockChange: (locked: boolean) => void;
  onInteractionRegionsChange: (regions: { x: number; y: number; width: number; height: number }[]) => void;
};

const FOLLOW_DISTANCE = 180;
const FOLLOW_START_DISTANCE = 220;
const HORIZONTAL_MARGIN = 90;
const TOP_MARGIN = 145;
const BOTTOM_MARGIN = 24;

export class DesktopWidgetScene extends Container {
  private readonly cat: DesktopCatActor;
  private readonly onInteractionRegionsChange: DesktopWidgetSceneOptions["onInteractionRegionsChange"];
  private screenWidth = 1120;
  private screenHeight = 630;
  private initialPositionApplied = false;
  private lastInteractionRegion = "";

  constructor(options: DesktopWidgetSceneOptions) {
    super({ label: "desktop-widget-scene" });
    this.onInteractionRegionsChange = options.onInteractionRegionsChange;
    this.cat = new DesktopCatActor({
      animations: options.animations,
      onFocusRequest: options.onFocusRequest,
      onInputLockChange: options.onInputLockChange,
    });
    this.addChild(this.cat);
  }

  update(deltaSeconds: number): void {
    this.cat.update(deltaSeconds);
    this.publishInteractionRegion();
  }

  /** WebView CSS 픽셀을 그대로 사용해 고양이의 커서 추적 목표를 갱신한다. */
  followCursor(screenX: number, screenY: number): void {
    if (this.cat.isPointerInteracting || this.cat.getInteractionRegion().contains(screenX, screenY)) {
      this.cat.stopFollowing();
      return;
    }
    const deltaX = screenX - this.cat.x;
    const deltaY = screenY - this.cat.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= FOLLOW_START_DISTANCE) {
      this.cat.stopFollowing();
      return;
    }
    const targetX = screenX - (deltaX / distance) * FOLLOW_DISTANCE;
    const targetY = screenY - (deltaY / distance) * FOLLOW_DISTANCE;
    this.cat.followTo(this.clampX(targetX), this.clampY(targetY));
  }

  /** 화면 크기가 바뀌어도 고양이의 발점이 실제 모니터 영역 안에 있도록 제한한다. */
  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    if (!this.initialPositionApplied) {
      this.cat.position.set(width / 2, height * 0.72);
      this.initialPositionApplied = true;
    } else {
      this.cat.position.set(this.clampX(this.cat.x), this.clampY(this.cat.y));
    }
    this.cat.setMovementBounds({
      left: Math.min(HORIZONTAL_MARGIN, width / 2),
      right: Math.max(width - HORIZONTAL_MARGIN, width / 2),
      top: Math.min(TOP_MARGIN, height / 2),
      bottom: Math.max(height - BOTTOM_MARGIN, height / 2),
    });
    this.publishInteractionRegion();
  }

  cancelPointerInteraction(): void {
    this.cat.cancelPointerInteraction();
  }

  private clampX(value: number): number {
    return Math.max(
      Math.min(HORIZONTAL_MARGIN, this.screenWidth / 2),
      Math.min(this.screenWidth - HORIZONTAL_MARGIN, value),
    );
  }

  private clampY(value: number): number {
    return Math.max(Math.min(TOP_MARGIN, this.screenHeight / 2), Math.min(this.screenHeight - BOTTOM_MARGIN, value));
  }

  private publishInteractionRegion(): void {
    const bounds = this.cat.getInteractionRegion();
    const region = {
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height),
    };
    const key = `${region.x}:${region.y}:${region.width}:${region.height}`;
    if (key === this.lastInteractionRegion) {
      return;
    }
    this.lastInteractionRegion = key;
    this.onInteractionRegionsChange([region]);
  }
}
