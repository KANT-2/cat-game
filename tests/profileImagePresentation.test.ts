import { describe, expect, it } from "vitest";
import { profileImagePresentation } from "../src/game/presentation/profileImage";

describe("profile image presentation", () => {
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
});
