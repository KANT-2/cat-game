import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");

describe("PWA entry", () => {
  it("registers the service worker before loading game assets", () => {
    const registrationIndex = mainSource.indexOf("registerPwa({");
    const gameStartupIndex = mainSource.indexOf("await GameApp.create(mount)");

    expect(registrationIndex).toBeGreaterThanOrEqual(0);
    expect(gameStartupIndex).toBeGreaterThan(registrationIndex);
  });
});
