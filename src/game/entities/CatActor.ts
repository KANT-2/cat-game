import { AnimatedSprite, Container, type FederatedPointerEvent, Point, Rectangle } from "pixi.js";
import type { LoadedSpriteSheet } from "../../assets/SpriteSheetLoader";
import type { CatAction, CatAnimationSet } from "./CatAnimations";
import { type CatBehaviorCommand, CatBehaviorStateMachine, type CatGait } from "./CatBehaviorStateMachine";
import { createCatGroundShadow, setCatGroundShadowClip } from "./CatGroundShadow";
import { normalizeCycleProgress, planCatMovementTiming } from "./CatMovementTiming";

type CatActorOptions = {
  project: (x: number, y: number) => Point;
  unproject: (x: number, y: number) => Point;
  canWalk: (x: number, y: number) => boolean;
  onFocusRequest: () => void;
  onLiftStart: () => void;
  onDragTargetChange: (target: CatDropTarget | null) => void;
  onTap: () => void;
  animations: CatAnimationSet;
};

export type CatDropTarget = {
  x: number;
  y: number;
  valid: boolean;
};

type PointerCaptureTarget = EventTarget & {
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
};

const DRAG_START_DISTANCE = 8;
const LIFT_HOLD_FRAME_RATIO = 0.48;
const DRAG_TAP_SUPPRESSION_MILLISECONDS = 250;
const DRAG_LIFT_HEIGHT = 52;
const DRAG_POSE_ACTION: CatAction = "scruffLift";

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

export class CatActor extends Container {
  gridX = 4;
  gridY = 4;
  private targetX = 4;
  private targetY = 4;
  private paused = false;
  private readonly projectGrid: CatActorOptions["project"];
  private readonly unprojectGrid: CatActorOptions["unproject"];
  private readonly canWalk: CatActorOptions["canWalk"];
  private readonly onLiftStart: CatActorOptions["onLiftStart"];
  private readonly onDragTargetChange: CatActorOptions["onDragTargetChange"];
  private readonly animations: CatAnimationSet;
  private readonly behavior = new CatBehaviorStateMachine();
  private readonly shadow: AnimatedSprite;
  private readonly sprite: AnimatedSprite;
  private currentAction: CatAction = "idle";
  private currentAnimationReversed = false;
  private movementCycleProgress = 0;
  private movementProgressPerGridUnit = 0;
  private reactionPending = false;
  private activePointerId: number | null = null;
  private pointerCaptureTarget: PointerCaptureTarget | null = null;
  private readonly pointerDownGlobal = new Point();
  private readonly dragOffset = new Point();
  private readonly dragStartGrid = new Point();
  private dragStarted = false;
  private dragDropTarget: CatDropTarget | null = null;
  private liftReleaseStartFrame: number | null = null;
  private lastDragEnd: { pointerId: number; timeStamp: number } | null = null;

  constructor(options: CatActorOptions) {
    super({ label: "cat" });
    this.projectGrid = options.project;
    this.unprojectGrid = options.unproject;
    this.canWalk = options.canWalk;
    this.onLiftStart = options.onLiftStart;
    this.onDragTargetChange = options.onDragTargetChange;
    this.animations = options.animations;
    this.zIndex = 999;
    this.eventMode = "static";
    this.cursor = "pointer";
    this.shadow = createCatGroundShadow(this.animations.idle, 0.68);
    this.sprite = new AnimatedSprite({ textures: this.animations.idle.textures, autoPlay: true });
    this.sprite.anchor.set(this.animations.idle.anchor.x, this.animations.idle.anchor.y);
    this.sprite.scale.set(0.68);
    this.configurePlayback(this.animations.idle);
    this.sprite.onFrameChange = (frame) => this.handleAnimationFrameChange(frame);
    this.addChild(this.shadow, this.sprite);
    this.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      options.onFocusRequest();
      this.beginPointerInteraction(event);
    });
    this.on("globalpointermove", (event: FederatedPointerEvent) => {
      this.handlePointerMove(event);
    });
    this.on("pointerup", (event: FederatedPointerEvent) => {
      this.finishPointerInteraction(event, false);
    });
    this.on("pointerupoutside", (event: FederatedPointerEvent) => {
      this.finishPointerInteraction(event, false);
    });
    this.on("pointercancel", (event: FederatedPointerEvent) => {
      this.finishPointerInteraction(event, true);
    });
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      if (this.shouldSuppressTap(event)) {
        return;
      }
      if (!this.paused && this.queueOrStartReaction()) {
        options.onTap();
      }
    });
    this.syncPosition();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.abortPointerInteraction();
      this.movementCycleProgress = 0;
      this.movementProgressPerGridUnit = 0;
      this.reactionPending = false;
      this.behavior.reset();
      this.liftReleaseStartFrame = null;
      this.sprite.y = 0;
      this.setAnimation("idle");
      return;
    }
    if (this.isMoving()) {
      this.startExistingMovement("walk");
    }
  }

  /**
   * 등록된 고양이 동작을 즉시 처음 프레임부터 재생한다.
   *
   * @param action - `CatAnimationSet`에 포함된 동작 이름.
   *
   * @remarks 기존 자율 행동을 끊고 요청을 우선한다. 점프·낙하는 착지로 이어지고,
   * 수면은 마지막 프레임을 일정 시간 유지한 뒤 역재생으로 깨어나 대기로 돌아간다.
   */
  playAction(action: CatAction): void {
    this.applyBehaviorCommand(this.behavior.requestAction(action));
  }

  /**
   * 데스크톱 위젯에서 실제 고양이 주변만 입력을 받기 위한 화면 영역을 계산한다.
   *
   * @returns WebView 왼쪽 위가 원점인 전역 CSS 픽셀 사각형.
   *
   * @remarks 256px 프레임 전체가 아니라 모든 동작의 몸과 꼬리를 포괄하는 작은 영역을 사용한다.
   */
  getPointerInteractionRegion(): Rectangle {
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
    if (this.paused || this.activePointerId !== null || event.button !== 0) {
      return;
    }
    const parent = this.parent;
    if (!parent) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.pointerDownGlobal.copyFrom(event.global);
    const pointerInParent = parent.toLocal(event.global);
    this.dragOffset.set(this.x - pointerInParent.x, this.y - pointerInParent.y);
    this.lastDragEnd = null;

    const nativeTarget = event.nativeEvent.target;
    if (supportsPointerCapture(nativeTarget)) {
      nativeTarget.setPointerCapture(event.pointerId);
      this.pointerCaptureTarget = nativeTarget;
    }
  }

  private handlePointerMove(event: FederatedPointerEvent): void {
    if (event.pointerId !== this.activePointerId || this.paused) {
      return;
    }
    if ((event.buttons & 1) === 0) {
      this.finishPointerInteraction(event, true);
      return;
    }
    if (!this.dragStarted) {
      const distance = Math.hypot(event.global.x - this.pointerDownGlobal.x, event.global.y - this.pointerDownGlobal.y);
      if (distance < DRAG_START_DISTANCE) {
        return;
      }
      this.startDragging();
    }
    event.stopPropagation();
    this.updateDragPosition(event.global);
  }

  private startDragging(): void {
    this.dragStarted = true;
    this.liftReleaseStartFrame = null;
    this.cursor = "grabbing";
    this.dragStartGrid.set(this.gridX, this.gridY);
    this.sprite.y = -DRAG_LIFT_HEIGHT;
    this.dragOffset.y += DRAG_LIFT_HEIGHT;
    this.targetX = this.gridX;
    this.targetY = this.gridY;
    this.movementCycleProgress = 0;
    this.movementProgressPerGridUnit = 0;
    this.reactionPending = false;
    this.onLiftStart();
    this.applyBehaviorCommand(this.behavior.requestAction(DRAG_POSE_ACTION));
  }

  private updateDragPosition(globalPosition: Point): void {
    const parent = this.parent;
    if (!parent) {
      return;
    }
    const pointerInParent = parent.toLocal(globalPosition);
    const desiredX = pointerInParent.x + this.dragOffset.x;
    const desiredY = pointerInParent.y + this.dragOffset.y;
    this.position.set(desiredX, desiredY);
    this.zIndex = 100_000;

    const logicalPoint = this.unprojectGrid(desiredX, desiredY);
    const target = {
      x: Math.round(logicalPoint.x - 0.5),
      y: Math.round(logicalPoint.y - 1),
      valid: false,
    };
    target.valid = this.canWalk(target.x, target.y);
    this.dragDropTarget = target;
    this.onDragTargetChange(target);
  }

  private finishPointerInteraction(event: FederatedPointerEvent, cancelled: boolean): void {
    if (event.pointerId !== this.activePointerId) {
      return;
    }
    event.stopPropagation();
    if (this.dragStarted) {
      this.finishDragging(cancelled);
      this.lastDragEnd = { pointerId: event.pointerId, timeStamp: event.timeStamp };
    }
    this.releasePointerCapture();
    this.activePointerId = null;
  }

  private finishDragging(cancelled: boolean): void {
    const dropTarget = this.dragDropTarget;
    if (!cancelled && dropTarget?.valid) {
      this.gridX = dropTarget.x;
      this.gridY = dropTarget.y;
    } else {
      this.gridX = this.dragStartGrid.x;
      this.gridY = this.dragStartGrid.y;
    }
    this.targetX = this.gridX;
    this.targetY = this.gridY;
    this.movementCycleProgress = 0;
    this.movementProgressPerGridUnit = 0;
    this.dragStarted = false;
    this.dragDropTarget = null;
    this.cursor = "pointer";
    this.onDragTargetChange(null);
    this.syncPosition();

    if (cancelled) {
      this.applyBehaviorCommand(this.behavior.reset());
      return;
    }
    const holdFrame = this.getLiftHoldFrame();
    const releaseFrame = Math.max(this.sprite.currentFrame, holdFrame);
    this.liftReleaseStartFrame = releaseFrame;
    this.sprite.gotoAndStop(releaseFrame);
    this.sprite.play();
  }

  private abortPointerInteraction(): void {
    if (this.dragStarted) {
      this.finishDragging(true);
    }
    this.releasePointerCapture();
    this.activePointerId = null;
  }

  private releasePointerCapture(): void {
    if (this.activePointerId !== null && this.pointerCaptureTarget?.hasPointerCapture(this.activePointerId)) {
      this.pointerCaptureTarget.releasePointerCapture(this.activePointerId);
    }
    this.pointerCaptureTarget = null;
  }

  private shouldSuppressTap(event: FederatedPointerEvent): boolean {
    if (!this.lastDragEnd || this.lastDragEnd.pointerId !== event.pointerId) {
      return false;
    }
    const elapsed = event.timeStamp - this.lastDragEnd.timeStamp;
    if (elapsed < 0 || elapsed > DRAG_TAP_SUPPRESSION_MILLISECONDS) {
      return false;
    }
    this.lastDragEnd = null;
    return true;
  }

  private handleAnimationFrameChange(frame: number): void {
    this.shadow.gotoAndStop(frame);
    if (this.dragStarted && this.currentAction === DRAG_POSE_ACTION) {
      const holdFrame = this.getLiftHoldFrame();
      if (frame >= holdFrame) {
        this.sprite.stop();
      }
      return;
    }
    if (this.currentAction === DRAG_POSE_ACTION && this.liftReleaseStartFrame !== null) {
      const finalFrame = this.sprite.totalFrames - 1;
      const releaseFrameCount = finalFrame - this.liftReleaseStartFrame;
      const progress =
        releaseFrameCount <= 0 ? 1 : Math.min(1, Math.max(0, (frame - this.liftReleaseStartFrame) / releaseFrameCount));
      this.sprite.y = -DRAG_LIFT_HEIGHT * (1 - progress);
      if (progress >= 1) {
        this.liftReleaseStartFrame = null;
        this.sprite.y = 0;
      }
    }
  }

  private getLiftHoldFrame(): number {
    return Math.floor((this.sprite.totalFrames - 1) * LIFT_HOLD_FRAME_RATIO);
  }

  /**
   * 공터에서 고양이가 걸어갈 빈 논리 셀을 지정한다.
   *
   * @param x - 공터의 좌우 셀 좌표.
   * @param y - 공터의 깊이 셀 좌표. 값이 클수록 화면 앞쪽이다.
   * @returns 대상 셀이 이동 가능해 목표가 바뀌면 `true`, 가구가 점유한 셀이면 `false`.
   *
   * @remarks 이동 중인 좌표는 화면 표현 상태이며 현재 `GameState` 저장 형식에는 포함하지 않는다.
   */
  walkTo(x: number, y: number): boolean {
    if (!this.canWalk(x, y)) {
      return false;
    }
    this.targetX = x;
    this.targetY = y;
    if (!this.behavior.canStartMovementImmediately) {
      return true;
    }
    if (this.behavior.isMoving) {
      this.planMovementToTarget();
      return true;
    }
    this.startExistingMovement("walk");
    return true;
  }

  update(deltaSeconds: number): void {
    if (this.paused) {
      return;
    }
    const command = this.behavior.update(deltaSeconds);
    if (command) {
      this.applyBehaviorCommand(command);
    }
    if (!this.behavior.isMoving) {
      return;
    }

    const distance = Math.hypot(this.targetX - this.gridX, this.targetY - this.gridY);
    if (distance <= 0.02) {
      this.finishMovement();
      return;
    }

    this.updateFacingDirection();
    const maximumTravel = this.reactionPending
      ? Math.min(deltaSeconds * this.behavior.movementSpeed, this.distanceToStrideBoundary())
      : deltaSeconds * this.behavior.movementSpeed;
    const travel = Math.min(distance, maximumTravel);
    this.gridX += ((this.targetX - this.gridX) / distance) * travel;
    this.gridY += ((this.targetY - this.gridY) / distance) * travel;
    this.advanceMovementAnimation(travel);
    this.syncPosition();

    if (this.reactionPending && this.movementCycleProgress === 0) {
      this.startPendingReaction();
      return;
    }
    if (travel >= distance - 0.000_001) {
      this.finishMovement();
    }
  }

  private chooseTarget(gait: CatGait): boolean {
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const;
    const shuffled = [...directions].sort(() => Math.random() - 0.5);
    for (const [dx, dy] of shuffled) {
      const maximumSteps = gait === "run" ? 2 : 1;
      for (let steps = maximumSteps; steps >= 1; steps -= 1) {
        const pathIsClear = Array.from({ length: steps }, (_, index) => index + 1).every((step) =>
          this.canWalk(Math.round(this.gridX) + dx * step, Math.round(this.gridY) + dy * step),
        );
        if (pathIsClear) {
          this.targetX = Math.round(this.gridX) + dx * steps;
          this.targetY = Math.round(this.gridY) + dy * steps;
          return true;
        }
      }
    }
    return false;
  }

  private syncPosition(): void {
    const point = this.projectGrid(this.gridX + 0.5, this.gridY + 1);
    this.position.set(point.x, point.y);
    this.zIndex = Math.round((this.gridY + 1) * 100 + 20);
  }

  private updateFacingDirection(): void {
    const current = this.projectGrid(this.gridX + 0.5, this.gridY + 1);
    const target = this.projectGrid(this.targetX + 0.5, this.targetY + 1);
    const screenDeltaX = target.x - current.x;
    if (Math.abs(screenDeltaX) < 0.5) {
      return;
    }
    this.scale.x = screenDeltaX > 0 ? -1 : 1;
  }

  private setAnimation(action: CatAction, restart = false, reverse = false): void {
    if (this.currentAction === action && this.currentAnimationReversed === reverse && !restart) {
      return;
    }
    const sourceClip = this.animations[action];
    const clip: LoadedSpriteSheet = reverse
      ? { ...sourceClip, textures: [...sourceClip.textures].reverse(), playback: "once" }
      : sourceClip;
    if (action !== DRAG_POSE_ACTION) {
      this.liftReleaseStartFrame = null;
      this.sprite.y = 0;
    }
    this.currentAction = action;
    this.currentAnimationReversed = reverse;
    setCatGroundShadowClip(this.shadow, clip);
    this.sprite.textures = clip.textures;
    this.sprite.anchor.set(clip.anchor.x, clip.anchor.y);
    const movementDriven = action === "walk" || action === "run";
    this.configurePlayback(clip, movementDriven);
    if (movementDriven) {
      this.showMovementFrame();
    } else {
      this.sprite.gotoAndPlay(0);
    }

    if (clip.playback !== "loop") {
      this.sprite.onComplete = () => {
        if (this.currentAction !== action) {
          return;
        }
        const nextCommand = this.behavior.animationFinished(action);
        if (nextCommand) {
          this.applyBehaviorCommand(nextCommand);
        }
      };
    }
  }

  private applyBehaviorCommand(command: CatBehaviorCommand): void {
    if (command.kind === "play") {
      this.setAnimation(command.action, true, command.reverse ?? false);
      return;
    }
    if (command.kind === "move") {
      if (this.chooseTarget(command.gait)) {
        this.movementCycleProgress = 0;
        this.setAnimation(command.gait, true);
        this.planMovementToTarget();
        return;
      }
      this.applyBehaviorCommand(this.behavior.movementRejected());
      return;
    }
    if (this.isMoving()) {
      this.startExistingMovement("walk");
      return;
    }
    this.setAnimation("idle");
  }

  private startExistingMovement(gait: CatGait): void {
    this.movementCycleProgress = 0;
    this.behavior.requestMovement(gait);
    this.setAnimation(gait, true);
    this.planMovementToTarget();
  }

  private configurePlayback(clip: LoadedSpriteSheet, manuallyDriven = false): void {
    this.sprite.animationSpeed = clip.framesPerSecond / 60;
    this.sprite.loop = clip.playback === "loop";
    this.sprite.autoUpdate = !manuallyDriven;
    this.sprite.onComplete = undefined;
    this.sprite.onLoop = undefined;
  }

  private queueOrStartReaction(): boolean {
    if (this.reactionPending || !this.behavior.canQueueReaction) {
      return false;
    }
    if (this.behavior.isMoving) {
      this.reactionPending = true;
      return true;
    }
    const command = this.behavior.requestReaction();
    if (!command) {
      return false;
    }
    this.applyBehaviorCommand(command);
    return true;
  }

  private planMovementToTarget(): void {
    const distance = Math.hypot(this.targetX - this.gridX, this.targetY - this.gridY);
    const clip = this.animations[this.behavior.currentAction];
    const cycleDuration = clip.textures.length / clip.framesPerSecond;
    const nominalCycleDistance = this.behavior.movementSpeed * cycleDuration;
    const timing = planCatMovementTiming(distance, this.movementCycleProgress, nominalCycleDistance);
    this.movementProgressPerGridUnit = timing.cycleProgressPerGridUnit;
  }

  private advanceMovementAnimation(distance: number): void {
    this.movementCycleProgress = normalizeCycleProgress(
      this.movementCycleProgress + distance * this.movementProgressPerGridUnit,
    );
    this.showMovementFrame();
  }

  private showMovementFrame(): void {
    const frame = Math.min(
      this.sprite.totalFrames - 1,
      Math.floor(this.movementCycleProgress * this.sprite.totalFrames),
    );
    this.sprite.gotoAndStop(frame);
  }

  private distanceToStrideBoundary(): number {
    if (this.movementProgressPerGridUnit <= 0) {
      return 0;
    }
    const progressToBoundary = this.movementCycleProgress > 0 ? 1 - this.movementCycleProgress : 1;
    return progressToBoundary / this.movementProgressPerGridUnit;
  }

  private startPendingReaction(): void {
    this.reactionPending = false;
    this.behavior.movementFinished();
    const command = this.behavior.requestReaction();
    if (command) {
      this.applyBehaviorCommand(command);
    }
  }

  private finishMovement(): void {
    this.gridX = this.targetX;
    this.gridY = this.targetY;
    this.movementCycleProgress = 0;
    this.movementProgressPerGridUnit = 0;
    this.syncPosition();
    if (this.reactionPending) {
      this.startPendingReaction();
      return;
    }
    this.applyBehaviorCommand(this.behavior.movementFinished());
  }

  private isMoving(): boolean {
    return Math.hypot(this.targetX - this.gridX, this.targetY - this.gridY) > 0.02;
  }
}
