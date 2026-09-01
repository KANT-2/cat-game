import type { CatAction } from "./CatAnimations";

export type CatGait = "run" | "walk";

export type CatBehaviorCommand =
  | { kind: "idle" }
  | { kind: "move"; gait: CatGait }
  | { kind: "play"; action: CatAction; reverse?: boolean };

type SleepPhase = "holding" | "playing" | "waking" | null;

type AmbientBehavior = {
  action: Exclude<CatAction, "idle" | "fall" | "hit" | "land">;
  weight: number;
};

const WALK_SPEED = 1.15;
const RUN_SPEED = 2.05;
const INITIAL_IDLE_MIN_SECONDS = 2.5;
const INITIAL_IDLE_RANGE_SECONDS = 2.5;
const SLEEP_HOLD_MIN_SECONDS = 5;
const SLEEP_HOLD_RANGE_SECONDS = 4;
const REACTION_COOLDOWN_SECONDS = 2.5;

const AMBIENT_BEHAVIORS: readonly AmbientBehavior[] = [
  { action: "walk", weight: 32 },
  { action: "run", weight: 12 },
  { action: "groom", weight: 16 },
  { action: "scratch", weight: 13 },
  { action: "sleep", weight: 10 },
  { action: "jump", weight: 8 },
  { action: "attack", weight: 5 },
  { action: "surprise", weight: 4 },
];

const RETURN_DELAYS: Record<CatAction, readonly [minimum: number, range: number]> = {
  idle: [2.5, 2.5],
  walk: [2, 2],
  run: [2.5, 2],
  attack: [4, 3],
  fall: [3, 2],
  groom: [5, 4],
  hit: [3, 2],
  jump: [3, 2],
  land: [3, 2],
  scratch: [5, 3],
  sleep: [6, 4],
  surprise: [3, 2],
};

/**
 * 화면 속 고양이의 자율 행동 순서와 대기 시간을 관리한다.
 *
 * @remarks PixiJS 객체나 좌표를 소유하지 않는 순수한 전이 제어기다. 이동 목적지 선택과
 * 실제 프레임 재생은 `CatActor`가 명령을 받아 수행하며, 완료 이벤트를 다시 이 객체에 전달한다.
 */
export class CatBehaviorStateMachine {
  private action: CatAction = "idle";
  private lastAmbientAction: AmbientBehavior["action"] | null = null;
  private reactionCooldownSeconds = 0;
  private remainingSeconds: number;
  private sleepPhase: SleepPhase = null;

  constructor(private readonly random: () => number = Math.random) {
    this.remainingSeconds = this.randomDuration(INITIAL_IDLE_MIN_SECONDS, INITIAL_IDLE_RANGE_SECONDS);
  }

  get currentAction(): CatAction {
    return this.action;
  }

  get movementSpeed(): number {
    if (this.action === "run") {
      return RUN_SPEED;
    }
    if (this.action === "walk") {
      return WALK_SPEED;
    }
    return 0;
  }

  get isMoving(): boolean {
    return this.action === "walk" || this.action === "run";
  }

  get canStartMovementImmediately(): boolean {
    return this.action === "idle" || this.isMoving;
  }

  get canQueueReaction(): boolean {
    return this.reactionCooldownSeconds <= 0 && (this.action === "idle" || this.isMoving);
  }

  /**
   * 현재 상태의 시간을 진행하고 필요한 다음 행동 명령을 반환한다.
   *
   * @param deltaSeconds - 직전 프레임 이후 흐른 초 단위 시간. 음수는 0으로 취급한다.
   * @returns 새 행동을 시작해야 할 때의 명령이며, 상태를 유지하면 `null`이다.
   */
  update(deltaSeconds: number): CatBehaviorCommand | null {
    const elapsed = Math.max(0, deltaSeconds);
    this.reactionCooldownSeconds = Math.max(0, this.reactionCooldownSeconds - elapsed);

    if (this.action === "idle") {
      this.remainingSeconds -= elapsed;
      if (this.remainingSeconds <= 0) {
        return this.chooseAmbientBehavior();
      }
      return null;
    }

    if (this.action === "sleep" && this.sleepPhase === "holding") {
      this.remainingSeconds -= elapsed;
      if (this.remainingSeconds <= 0) {
        this.sleepPhase = "waking";
        return { kind: "play", action: "sleep", reverse: true };
      }
    }
    return null;
  }

  requestMovement(gait: CatGait): CatBehaviorCommand {
    this.action = gait;
    this.sleepPhase = null;
    return { kind: "move", gait };
  }

  requestAction(action: CatAction): CatBehaviorCommand {
    if (action === "idle") {
      return this.enterIdleAfter("idle");
    }
    if (action === "walk" || action === "run") {
      return this.requestMovement(action);
    }
    this.action = action;
    this.sleepPhase = action === "sleep" ? "playing" : null;
    return { kind: "play", action };
  }

  /**
   * 고양이 클릭 반응을 현재 동작을 해치지 않는 경우에만 시작한다.
   *
   * @returns 대기 중이고 재입력 제한 시간이 끝났으면 놀람 명령, 그 외에는 `null`.
   * @remarks 이동 중 클릭은 `CatActor`가 걸음 주기 끝까지 예약한 뒤 다시 호출한다.
   */
  requestReaction(): CatBehaviorCommand | null {
    if (this.action !== "idle" || this.reactionCooldownSeconds > 0) {
      return null;
    }
    this.action = "surprise";
    this.sleepPhase = null;
    return { kind: "play", action: "surprise" };
  }

  movementFinished(): CatBehaviorCommand {
    return this.enterIdleAfter(this.action);
  }

  movementRejected(): CatBehaviorCommand {
    return this.enterIdle(1.2, 1);
  }

  /**
   * 재생 중인 비반복 애니메이션의 완료를 상태 전이에 반영한다.
   *
   * @param action - 완료 콜백을 발생시킨 애니메이션 동작.
   * @returns 점프·낙하 뒤 착지나 수면 역재생처럼 즉시 이어 재생할 명령, 또는 대기 복귀 명령이다.
   * 현재 상태와 무관한 오래된 완료 콜백은 `null`로 무시한다.
   */
  animationFinished(action: CatAction): CatBehaviorCommand | null {
    if (this.action !== action) {
      return null;
    }
    if (action === "jump" || action === "fall") {
      this.action = "land";
      return { kind: "play", action: "land" };
    }
    if (action === "sleep") {
      if (this.sleepPhase === "playing") {
        this.sleepPhase = "holding";
        this.remainingSeconds = this.randomDuration(SLEEP_HOLD_MIN_SECONDS, SLEEP_HOLD_RANGE_SECONDS);
        return null;
      }
      if (this.sleepPhase === "waking") {
        return this.enterIdleAfter("sleep");
      }
      return null;
    }
    if (action === "surprise") {
      this.reactionCooldownSeconds = REACTION_COOLDOWN_SECONDS;
    }
    return this.enterIdleAfter(action);
  }

  reset(): CatBehaviorCommand {
    this.action = "idle";
    this.sleepPhase = null;
    this.reactionCooldownSeconds = 0;
    this.remainingSeconds = this.randomDuration(INITIAL_IDLE_MIN_SECONDS, INITIAL_IDLE_RANGE_SECONDS);
    return { kind: "idle" };
  }

  private chooseAmbientBehavior(): CatBehaviorCommand {
    const candidates = AMBIENT_BEHAVIORS.filter((candidate) => candidate.action !== this.lastAmbientAction);
    const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
    let roll = this.random() * totalWeight;
    let selected = candidates[candidates.length - 1];

    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll < 0) {
        selected = candidate;
        break;
      }
    }

    this.lastAmbientAction = selected.action;
    if (selected.action === "walk" || selected.action === "run") {
      return this.requestMovement(selected.action);
    }
    return this.requestAction(selected.action);
  }

  private enterIdleAfter(action: CatAction): CatBehaviorCommand {
    const [minimum, range] = RETURN_DELAYS[action];
    return this.enterIdle(minimum, range);
  }

  private enterIdle(minimum: number, range: number): CatBehaviorCommand {
    this.action = "idle";
    this.sleepPhase = null;
    this.remainingSeconds = this.randomDuration(minimum, range);
    return { kind: "idle" };
  }

  private randomDuration(minimum: number, range: number): number {
    return minimum + this.random() * range;
  }
}
