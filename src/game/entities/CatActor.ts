import { AnimatedSprite, Container, type FederatedPointerEvent, type Point } from "pixi.js";
import type { LoadedSpriteSheet } from "../../assets/SpriteSheetLoader";
import type { CatAction, CatAnimationSet } from "./CatAnimations";
import { type CatBehaviorCommand, CatBehaviorStateMachine, type CatGait } from "./CatBehaviorStateMachine";
import { createCatGroundShadow, setCatGroundShadowClip } from "./CatGroundShadow";
import { normalizeCycleProgress, planCatMovementTiming } from "./CatMovementTiming";

type CatActorOptions = {
  project: (x: number, y: number) => Point;
  canWalk: (x: number, y: number) => boolean;
  onTap: () => void;
  animations: CatAnimationSet;
};

export class CatActor extends Container {
  gridX = 4;
  gridY = 4;
  private targetX = 4;
  private targetY = 4;
  private paused = false;
  private readonly projectGrid: CatActorOptions["project"];
  private readonly canWalk: CatActorOptions["canWalk"];
  private readonly animations: CatAnimationSet;
  private readonly behavior = new CatBehaviorStateMachine();
  private readonly shadow: AnimatedSprite;
  private readonly sprite: AnimatedSprite;
  private currentAction: CatAction = "idle";
  private currentAnimationReversed = false;
  private movementCycleProgress = 0;
  private movementProgressPerGridUnit = 0;
  private reactionPending = false;

  constructor(options: CatActorOptions) {
    super({ label: "cat" });
    this.projectGrid = options.project;
    this.canWalk = options.canWalk;
    this.animations = options.animations;
    this.zIndex = 999;
    this.eventMode = "static";
    this.cursor = "pointer";
    this.shadow = createCatGroundShadow(this.animations.idle, 0.68);
    this.sprite = new AnimatedSprite({ textures: this.animations.idle.textures, autoPlay: true });
    this.sprite.anchor.set(this.animations.idle.anchor.x, this.animations.idle.anchor.y);
    this.sprite.scale.set(0.68);
    this.configurePlayback(this.animations.idle);
    this.sprite.onFrameChange = (frame) => this.shadow.gotoAndStop(frame);
    this.addChild(this.shadow, this.sprite);
    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      if (!this.paused && this.queueOrStartReaction()) {
        options.onTap();
      }
    });
    this.syncPosition();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.movementCycleProgress = 0;
      this.movementProgressPerGridUnit = 0;
      this.reactionPending = false;
      this.behavior.reset();
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
