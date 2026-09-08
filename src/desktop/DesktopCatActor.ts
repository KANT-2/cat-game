import { AnimatedSprite, Container, type FederatedPointerEvent, Point, Rectangle } from "pixi.js";
import type { LoadedSpriteSheet } from "../assets/SpriteSheetLoader";
import type { CatAction, CatAnimationSet } from "../game/entities/CatAnimations";
import { createCatGroundShadow, setCatGroundShadowClip } from "../game/entities/CatGroundShadow";
import { normalizeCycleProgress } from "../game/entities/CatMovementTiming";

type DesktopCatActorOptions = {
  animations: CatAnimationSet;
  onFocusRequest: () => void;
  onInputLockChange: (locked: boolean) => void;
};

type PointerCaptureTarget = EventTarget & {
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
};

type MovementBounds = { left: number; right: number; top: number; bottom: number };

const DISPLAY_SCALE = 0.68;
const WALK_SPEED_PIXELS_PER_SECOND = 250;
const DRAG_START_DISTANCE = 8;
const DRAG_LIFT_HEIGHT = 52;
const DROP_DURATION_SECONDS = 0.32;
const LIFT_HOLD_FRAME_RATIO = 0.48;
const TAP_SUPPRESSION_MILLISECONDS = 250;
const AMBIENT_ACTIONS = ["groom", "scratch"] as const satisfies readonly CatAction[];

function supportsPointerCapture(target: EventTarget | null): target is PointerCaptureTarget {
  if (!target) {
    return false;
  }
  const candidate = target as Partial<PointerCaptureTarget>;
  return (
    typeof candidate.setPointerCapture === "function" &&
    typeof candidate.releasePointerCapture === "function" &&
    typeof candidate.hasPointerCapture === "function"
  );
}

export class DesktopCatActor extends Container {
  private readonly animations: CatAnimationSet;
  private readonly onInputLockChange: DesktopCatActorOptions["onInputLockChange"];
  private readonly shadow: AnimatedSprite;
  private readonly sprite: AnimatedSprite;
  private currentAction: CatAction = "idle";
  private followTarget: Point | null = null;
  private bounds: MovementBounds = { left: 90, right: 1030, top: 145, bottom: 606 };
  private movementCycleProgress = 0;
  private idleSeconds = 3;
  private ambientSeconds = 0;
  private activePointerId: number | null = null;
  private pointerCaptureTarget: PointerCaptureTarget | null = null;
  private readonly pointerDownGlobal = new Point();
  private readonly dragOffset = new Point();
  private dragging = false;
  private dropSeconds: number | null = null;
  private lastDragEnd: { pointerId: number; timeStamp: number } | null = null;

  constructor(options: DesktopCatActorOptions) {
    super({ label: "desktop-cat" });
    this.animations = options.animations;
    this.onInputLockChange = options.onInputLockChange;
    this.eventMode = "static";
    this.cursor = "pointer";
    this.shadow = createCatGroundShadow(this.animations.idle, DISPLAY_SCALE);
    this.sprite = new AnimatedSprite({ textures: this.animations.idle.textures, autoPlay: true });
    this.sprite.anchor.set(this.animations.idle.anchor.x, this.animations.idle.anchor.y);
    this.sprite.scale.set(DISPLAY_SCALE);
    this.sprite.onFrameChange = (frame) => this.handleAnimationFrameChange(frame);
    this.addChild(this.shadow, this.sprite);
    this.configureAnimation(this.animations.idle);

    this.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onFocusRequest();
      this.beginPointerInteraction(event);
    });
    this.on("globalpointermove", (event: FederatedPointerEvent) => this.handlePointerMove(event));
    this.on("pointerup", (event: FederatedPointerEvent) => this.finishPointerInteraction(event, false));
    this.on("pointerupoutside", (event: FederatedPointerEvent) => this.finishPointerInteraction(event, false));
    this.on("pointercancel", (event: FederatedPointerEvent) => this.finishPointerInteraction(event, true));
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      if (!this.shouldSuppressTap(event)) {
        this.followTarget = null;
        this.playTimedAction("surprise");
      }
    });
  }

  get isPointerInteracting(): boolean {
    return this.activePointerId !== null || this.dropSeconds !== null;
  }

  setMovementBounds(bounds: MovementBounds): void {
    this.bounds = bounds;
    this.position.set(this.clampX(this.x), this.clampY(this.y));
  }

  followTo(x: number, y: number): void {
    if (this.isPointerInteracting) {
      return;
    }
    this.followTarget = new Point(this.clampX(x), this.clampY(y));
    if (this.currentAction !== "walk") {
      this.movementCycleProgress = 0;
      this.setAnimation("walk");
    }
  }

  stopFollowing(): void {
    this.followTarget = null;
    if (this.currentAction === "walk") {
      this.enterIdle();
    }
  }

  update(deltaSeconds: number): void {
    const elapsed = Math.max(0, deltaSeconds);
    if (this.dropSeconds !== null) {
      this.updateDrop(elapsed);
      return;
    }
    if (this.dragging) {
      return;
    }
    if (this.followTarget) {
      this.updateFollowing(elapsed);
      return;
    }
    this.updateAmbient(elapsed);
  }

  /** 포커스 손실 시 포인터 캡처와 네이티브 입력 잠금을 반드시 해제한다. */
  cancelPointerInteraction(): void {
    if (this.activePointerId === null) {
      return;
    }
    this.dragging = false;
    this.dropSeconds = null;
    this.sprite.y = 0;
    this.releasePointerCapture();
    this.activePointerId = null;
    this.onInputLockChange(false);
    this.enterIdle();
  }

  getInteractionRegion(): Rectangle {
    const topLeft = this.toGlobal(new Point(-74, this.sprite.y - 130));
    const bottomRight = this.toGlobal(new Point(74, 12));
    return new Rectangle(
      Math.min(topLeft.x, bottomRight.x),
      Math.min(topLeft.y, bottomRight.y),
      Math.abs(bottomRight.x - topLeft.x),
      Math.abs(bottomRight.y - topLeft.y),
    );
  }

  private beginPointerInteraction(event: FederatedPointerEvent): void {
    if (event.button !== 0 || this.activePointerId !== null) {
      return;
    }
    const parent = this.parent;
    if (!parent) {
      return;
    }
    this.stopFollowing();
    this.activePointerId = event.pointerId;
    this.pointerDownGlobal.copyFrom(event.global);
    const pointerInParent = parent.toLocal(event.global);
    this.dragOffset.set(this.x - pointerInParent.x, this.y - pointerInParent.y);
    this.lastDragEnd = null;
    this.onInputLockChange(true);

    const nativeTarget = event.nativeEvent.target;
    if (supportsPointerCapture(nativeTarget)) {
      nativeTarget.setPointerCapture(event.pointerId);
      this.pointerCaptureTarget = nativeTarget;
    }
  }

  private handlePointerMove(event: FederatedPointerEvent): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    if ((event.buttons & 1) === 0) {
      this.finishPointerInteraction(event, true);
      return;
    }
    if (!this.dragging) {
      const distance = Math.hypot(event.global.x - this.pointerDownGlobal.x, event.global.y - this.pointerDownGlobal.y);
      if (distance < DRAG_START_DISTANCE) {
        return;
      }
      this.startDragging();
    }
    event.stopPropagation();
    const parent = this.parent;
    if (!parent) {
      return;
    }
    const pointerInParent = parent.toLocal(event.global);
    this.position.set(
      this.clampX(pointerInParent.x + this.dragOffset.x),
      this.clampY(pointerInParent.y + this.dragOffset.y),
    );
  }

  private startDragging(): void {
    this.dragging = true;
    this.cursor = "grabbing";
    this.sprite.y = -DRAG_LIFT_HEIGHT;
    this.dragOffset.y += DRAG_LIFT_HEIGHT;
    this.setAnimation("scruffLift", true);
  }

  private finishPointerInteraction(event: FederatedPointerEvent, cancelled: boolean): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    event.stopPropagation();
    if (this.dragging) {
      this.lastDragEnd = { pointerId: event.pointerId, timeStamp: event.timeStamp };
      if (cancelled) {
        this.sprite.y = 0;
        this.enterIdle();
      } else {
        this.dropSeconds = 0;
        this.sprite.play();
      }
    }
    this.dragging = false;
    this.cursor = "pointer";
    this.releasePointerCapture();
    this.activePointerId = null;
    this.onInputLockChange(false);
  }

  private updateDrop(deltaSeconds: number): void {
    const elapsed = Math.min(DROP_DURATION_SECONDS, (this.dropSeconds ?? 0) + deltaSeconds);
    this.dropSeconds = elapsed;
    const progress = elapsed / DROP_DURATION_SECONDS;
    this.sprite.y = -DRAG_LIFT_HEIGHT * (1 - progress);
    if (progress < 1) {
      return;
    }
    this.dropSeconds = null;
    this.sprite.y = 0;
    this.playTimedAction("land");
  }

  private updateFollowing(deltaSeconds: number): void {
    const target = this.followTarget;
    if (!target) {
      return;
    }
    const deltaX = target.x - this.x;
    const deltaY = target.y - this.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= 2) {
      this.position.copyFrom(target);
      this.stopFollowing();
      return;
    }
    this.scale.x = deltaX > 0 ? -1 : 1;
    const travel = Math.min(distance, WALK_SPEED_PIXELS_PER_SECOND * deltaSeconds);
    this.x += (deltaX / distance) * travel;
    this.y += (deltaY / distance) * travel;
    const clip = this.animations.walk;
    const cycleDistance = WALK_SPEED_PIXELS_PER_SECOND * (clip.textures.length / clip.framesPerSecond);
    this.movementCycleProgress = normalizeCycleProgress(this.movementCycleProgress + travel / cycleDistance);
    const frame = Math.min(clip.textures.length - 1, Math.floor(this.movementCycleProgress * clip.textures.length));
    this.sprite.gotoAndStop(frame);
  }

  private updateAmbient(deltaSeconds: number): void {
    if (this.currentAction !== "idle") {
      this.ambientSeconds -= deltaSeconds;
      if (this.ambientSeconds <= 0) {
        this.enterIdle();
      }
      return;
    }
    this.idleSeconds -= deltaSeconds;
    if (this.idleSeconds > 0) {
      return;
    }
    const action = AMBIENT_ACTIONS[Math.floor(Math.random() * AMBIENT_ACTIONS.length)] ?? "groom";
    this.playTimedAction(action);
  }

  private playTimedAction(action: CatAction): void {
    const clip = this.animations[action];
    this.setAnimation(action, true);
    this.ambientSeconds = Math.max(0.6, clip.textures.length / clip.framesPerSecond);
  }

  private enterIdle(): void {
    this.setAnimation("idle");
    this.idleSeconds = 3 + Math.random() * 4;
    this.ambientSeconds = 0;
  }

  private setAnimation(action: CatAction, restart = false): void {
    if (this.currentAction === action && !restart) {
      return;
    }
    const clip = this.animations[action];
    this.currentAction = action;
    setCatGroundShadowClip(this.shadow, clip);
    this.sprite.textures = clip.textures;
    this.sprite.anchor.set(clip.anchor.x, clip.anchor.y);
    this.configureAnimation(clip, action === "walk");
    if (action === "walk") {
      this.sprite.gotoAndStop(0);
    } else {
      this.sprite.gotoAndPlay(0);
    }
  }

  private configureAnimation(clip: LoadedSpriteSheet, manuallyDriven = false): void {
    this.sprite.animationSpeed = clip.framesPerSecond / 60;
    this.sprite.loop = clip.playback === "loop";
    this.sprite.autoUpdate = !manuallyDriven;
  }

  private handleAnimationFrameChange(frame: number): void {
    this.shadow.gotoAndStop(frame);
    if (this.dragging && this.currentAction === "scruffLift") {
      const holdFrame = Math.floor((this.sprite.totalFrames - 1) * LIFT_HOLD_FRAME_RATIO);
      if (frame >= holdFrame) {
        this.sprite.stop();
      }
    }
  }

  private shouldSuppressTap(event: FederatedPointerEvent): boolean {
    if (!this.lastDragEnd || this.lastDragEnd.pointerId !== event.pointerId) {
      return false;
    }
    const elapsed = event.timeStamp - this.lastDragEnd.timeStamp;
    if (elapsed < 0 || elapsed > TAP_SUPPRESSION_MILLISECONDS) {
      return false;
    }
    this.lastDragEnd = null;
    return true;
  }

  private releasePointerCapture(): void {
    if (this.activePointerId !== null && this.pointerCaptureTarget?.hasPointerCapture(this.activePointerId)) {
      this.pointerCaptureTarget.releasePointerCapture(this.activePointerId);
    }
    this.pointerCaptureTarget = null;
  }

  private clampX(value: number): number {
    return Math.max(this.bounds.left, Math.min(this.bounds.right, value));
  }

  private clampY(value: number): number {
    return Math.max(this.bounds.top, Math.min(this.bounds.bottom, value));
  }
}
