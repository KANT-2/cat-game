import { Assets, Texture } from "pixi.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cachedProfileImageTexture,
  loadProfileImageTexture,
  profileImagePresentation,
} from "../src/game/presentation/profileImage";

describe("profile image presentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the linked state when a student profile URL is available", () => {
    expect(profileImagePresentation("http://example.com/media/profiles/student.jpg")).toEqual({
      isLinked: true,
      statusMessage: "settings.profileImageAvailable",
    });
  });

  it("uses the fallback state when the profile URL is missing", () => {
    expect(profileImagePresentation(null)).toEqual({
      isLinked: false,
      statusMessage: "settings.profileImageUnavailable",
    });
  });

  it("forces the texture parser for an authenticated image endpoint without an extension", async () => {
    const url = "https://example.com/api/v1/session/me/profile-image";
    const load = vi.spyOn(Assets, "load").mockResolvedValue(Texture.EMPTY);

    await expect(loadProfileImageTexture(url)).resolves.toBe(Texture.EMPTY);
    expect(load).toHaveBeenCalledWith({ alias: url, src: url, parser: "loadTextures" });
  });

  it("returns no cached texture instead of passing a missing asset to Sprite.from", () => {
    const url = "https://example.com/api/v1/session/me/missing-profile-image";

    expect(cachedProfileImageTexture(url)).toBeNull();
  });
});
