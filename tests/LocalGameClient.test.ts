import { describe, expect, it, vi } from "vitest";
import type { GameStateRepository } from "../src/core/GameClient";
import { LocalGameClient } from "../src/core/LocalGameClient";
import { createDefaultState, type GameState } from "../src/domain/room";

class MemoryRepository implements GameStateRepository {
  state = createDefaultState();
  save = vi.fn((state: GameState) => {
    this.state = structuredClone(state);
  });

  load(): GameState {
    return structuredClone(this.state);
  }
}

describe("LocalGameClient", () => {
  it("places furniture through the game contract", () => {
    const repository = new MemoryRepository();
    repository.state.furniture = [];
    const client = new LocalGameClient(repository);
    const listener = vi.fn();
    client.subscribe(listener);

    const result = client.placeFurniture({ kind: "plant", x: 3, y: 3, rotation: 0 });

    expect(result.ok).toBe(true);
    expect(client.getSnapshot().furniture).toHaveLength(1);
    expect(repository.save).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rejects overlapping furniture without saving", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);
    const result = client.placeFurniture({ kind: "plant", x: 1, y: 1, rotation: 0 });

    expect(result).toEqual({ ok: false, reason: "occupied" });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("awards a quiz only once", () => {
    const repository = new MemoryRepository();
    repository.state.completedQuizIds = [];
    const client = new LocalGameClient(repository);

    expect(client.answerQuiz("python-range-001", "zero-to-two")).toMatchObject({
      ok: true,
      correct: true,
      firstCompletion: true,
      coinsAwarded: 25,
    });
    expect(client.answerQuiz("python-range-001", "zero-to-two")).toMatchObject({
      ok: true,
      correct: true,
      firstCompletion: false,
      coinsAwarded: 0,
    });
    expect(client.getSnapshot().coins).toBe(145);
  });

  it("keeps answer validation and rewards inside the game system", () => {
    const repository = new MemoryRepository();
    const client = new LocalGameClient(repository);

    expect(client.answerQuiz("python-range-001", "one-to-three")).toMatchObject({
      ok: true,
      correct: false,
      coinsAwarded: 0,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });
});
