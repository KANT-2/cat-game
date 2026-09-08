import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { layoutToFillViewport } from "../src/game/components/fullscreenLayout";

describe("layoutToFillViewport", () => {
  it("keeps UI at its original size when the viewport expands", () => {
    const content = new Container();

    layoutToFillViewport(content, 1920, 1080);

    expect(content.scale.x).toBe(1);
    expect(content.scale.y).toBe(1);
    expect(content.position.x).toBe(160);
    expect(content.position.y).toBe(90);
  });

  it("shrinks UI uniformly and centers it when the viewport is smaller", () => {
    const content = new Container();

    layoutToFillViewport(content, 1024, 640);

    expect(content.scale.x).toBeCloseTo(0.64);
    expect(content.scale.y).toBeCloseTo(0.64);
    expect(content.position.x).toBeCloseTo(0);
    expect(content.position.y).toBeCloseTo(32);
  });
});
