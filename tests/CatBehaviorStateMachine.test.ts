import { describe, expect, it } from "vitest";
import { type CatBehaviorCommand, CatBehaviorStateMachine } from "../src/game/entities/CatBehaviorStateMachine";

function randomSequence(values: number[]): () => number {
  const remaining = [...values];
  return () => remaining.shift() ?? 0;
}

describe("CatBehaviorStateMachine", () => {
  it.each<[number, CatBehaviorCommand]>([
    [0.1, { kind: "move", gait: "walk" }],
    [0.4, { kind: "move", gait: "run" }],
    [0.5, { kind: "play", action: "groom" }],
    [0.65, { kind: "play", action: "scratch" }],
    [0.8, { kind: "play", action: "sleep" }],
    [0.88, { kind: "play", action: "jump" }],
    [0.94, { kind: "play", action: "attack" }],
    [0.99, { kind: "play", action: "surprise" }],
  ])("selects an ambient behavior for roll %s", (roll, expected) => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, roll]));

    expect(behavior.update(2.49)).toBeNull();
    expect(behavior.update(0.02)).toEqual(expected);
  });

  it("uses a faster speed for running and returns to idle after arrival", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, 0.4, 0]));

    expect(behavior.update(3)).toEqual({ kind: "move", gait: "run" });
    expect(behavior.currentAction).toBe("run");
    expect(behavior.movementSpeed).toBeGreaterThan(1.15);

    expect(behavior.movementFinished()).toEqual({ kind: "idle" });
    expect(behavior.currentAction).toBe("idle");
    expect(behavior.movementSpeed).toBe(0);
  });

  it("does not select the same autonomous behavior twice in succession", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, 0, 0, 0]));

    expect(behavior.update(3)).toEqual({ kind: "move", gait: "walk" });
    expect(behavior.movementFinished()).toEqual({ kind: "idle" });
    expect(behavior.update(2)).toEqual({ kind: "move", gait: "run" });
  });

  it("chains jumping and falling into a landing before returning to idle", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, 0]));

    expect(behavior.requestAction("jump")).toEqual({ kind: "play", action: "jump" });
    expect(behavior.animationFinished("jump")).toEqual({ kind: "play", action: "land" });
    expect(behavior.animationFinished("jump")).toBeNull();
    expect(behavior.animationFinished("land")).toEqual({ kind: "idle" });

    expect(behavior.requestAction("fall")).toEqual({ kind: "play", action: "fall" });
    expect(behavior.animationFinished("fall")).toEqual({ kind: "play", action: "land" });
  });

  it("holds the sleeping pose and reverses it before returning to idle", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, 0.8, 0, 0]));

    expect(behavior.update(3)).toEqual({ kind: "play", action: "sleep" });
    expect(behavior.animationFinished("sleep")).toBeNull();
    expect(behavior.update(4.9)).toBeNull();
    expect(behavior.update(0.11)).toEqual({ kind: "play", action: "sleep", reverse: true });
    expect(behavior.animationFinished("sleep")).toEqual({ kind: "idle" });
  });

  it("debounces repeated click reactions during playback and the following pause", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, 0]));

    expect(behavior.requestReaction()).toEqual({ kind: "play", action: "surprise" });
    expect(behavior.requestReaction()).toBeNull();
    expect(behavior.animationFinished("surprise")).toEqual({ kind: "idle" });
    expect(behavior.requestReaction()).toBeNull();
    expect(behavior.update(2.49)).toBeNull();
    expect(behavior.requestReaction()).toBeNull();
    expect(behavior.update(0.02)).toBeNull();
    expect(behavior.requestReaction()).toEqual({ kind: "play", action: "surprise" });
  });

  it("queues interaction and movement only around interruptible states", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0]));

    expect(behavior.canStartMovementImmediately).toBe(true);
    expect(behavior.canQueueReaction).toBe(true);
    behavior.requestAction("groom");
    expect(behavior.canStartMovementImmediately).toBe(false);
    expect(behavior.canQueueReaction).toBe(false);
  });

  it("returns to idle after a mouse lift animation finishes", () => {
    const behavior = new CatBehaviorStateMachine(randomSequence([0, 0]));

    expect(behavior.requestAction("scruffLift")).toEqual({ kind: "play", action: "scruffLift" });
    expect(behavior.currentAction).toBe("scruffLift");
    expect(behavior.canStartMovementImmediately).toBe(false);
    expect(behavior.animationFinished("scruffLift")).toEqual({ kind: "idle" });
    expect(behavior.currentAction).toBe("idle");
  });
});
