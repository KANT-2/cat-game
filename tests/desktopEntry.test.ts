import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const gameHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const desktopHtml = await readFile(new URL("../desktop-widget.html", import.meta.url), "utf8");

describe("desktop widget entry", () => {
  it("uses a frontend entry that is separate from the PWA game", () => {
    expect(gameHtml).toContain('src="/src/main.ts"');
    expect(gameHtml).not.toContain("desktop-main.ts");
    expect(desktopHtml).toContain('src="/src/desktop-main.ts"');
    expect(desktopHtml).not.toContain('src="/src/main.ts"');
  });
});
