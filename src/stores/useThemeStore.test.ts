import { describe, expect, it } from "vitest";
import { defaultCustomAccentColor } from "../lib/color";
import { normalizeThemeState } from "./useThemeStore";

describe("theme store normalization", () => {
  it("keeps custom color values normalized", () => {
    expect(
      normalizeThemeState({
        themeColorId: "custom",
        customAccentColor: "8D8A94",
      }),
    ).toMatchObject({
      themeColorId: "custom",
      customAccentColor: "#8d8a94",
    });
  });

  it("falls back for invalid theme or custom color values", () => {
    expect(
      normalizeThemeState({
        themeColorId: "unknown",
        customAccentColor: "bad",
      }),
    ).toMatchObject({
      themeColorId: "gray",
      customAccentColor: defaultCustomAccentColor,
    });
  });
});
