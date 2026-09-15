import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");

describe("web entry", () => {
  it("starts the game without registering a service worker", () => {
    expect(mainSource).toContain("await GameApp.create(mount)");
    expect(mainSource).not.toContain("serviceWorker");
    expect(mainSource).not.toContain("registerPwa");
  });
});
