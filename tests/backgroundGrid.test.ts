import { describe, expect, it } from "vitest";
import { shopItemDefinitions } from "../src/domain/shop";
import { gridToScreen, screenToGrid } from "../src/game/belt";
import { backgroundGridProfiles, resolveBackgroundGrid, type WallpaperItemId } from "../src/game/forest/BackgroundGrid";

const wallpaperIds = Object.entries(shopItemDefinitions)
  .filter(([, definition]) => definition.kind === "wallpaper")
  .map(([itemId]) => itemId as WallpaperItemId);

describe("background placement grids", () => {
  it("defines a valid screen projection for every background product", () => {
    expect(Object.keys(backgroundGridProfiles).sort()).toEqual([...wallpaperIds].sort());

    for (const itemId of wallpaperIds) {
      const profile = resolveBackgroundGrid(itemId);
      expect(profile.columns).toBe(10);
      expect(profile.rows).toBe(8);
      expect(profile.nearY).toBeGreaterThan(profile.farY);
      expect(profile.nearWidth).toBeGreaterThanOrEqual(profile.farWidth);
      expect(profile.centerX - profile.nearWidth / 2).toBeGreaterThanOrEqual(0);
      expect(profile.centerX + profile.nearWidth / 2).toBeLessThanOrEqual(1_600);
    }
  });

  it("keeps logical coordinates reversible for every background", () => {
    for (const itemId of wallpaperIds) {
      const profile = resolveBackgroundGrid(itemId);
      const screen = gridToScreen(profile, 3.25, 6.5);
      const logical = screenToGrid(profile, screen.x, screen.y);
      expect(logical.x).toBeCloseTo(3.25);
      expect(logical.y).toBeCloseTo(6.5);
    }
  });

  it("uses map-specific floor bounds without changing the default fallback", () => {
    expect(resolveBackgroundGrid(null)).toBe(backgroundGridProfiles["wallpaper.cream"]);
    expect(resolveBackgroundGrid("furniture.sofa")).toBe(backgroundGridProfiles["wallpaper.cream"]);
    expect(resolveBackgroundGrid("wallpaper.workingHarbor")).not.toBe(backgroundGridProfiles["wallpaper.cream"]);
    expect(resolveBackgroundGrid("wallpaper.workingHarbor").nearY).toBe(790);
    expect(resolveBackgroundGrid("wallpaper.botanicalDesk").farY).toBe(530);
  });
});
