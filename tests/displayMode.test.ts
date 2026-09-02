import { describe, expect, it } from "vitest";
import { resolveAppDisplayMode } from "../src/app/displayMode";

describe("resolveAppDisplayMode", () => {
  it("selects the desktop widget only for its explicit query value", () => {
    expect(resolveAppDisplayMode("?display=desktop-widget")).toBe("desktop-widget");
  });

  it("keeps normal web and unknown display modes in the game presentation", () => {
    expect(resolveAppDisplayMode("")).toBe("game");
    expect(resolveAppDisplayMode("?display=unknown")).toBe("game");
  });
});
