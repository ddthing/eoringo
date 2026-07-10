import { describe, expect, it } from "vitest";
import { defaultThemeColorId, grayThemeTokens, isThemeColorId, themeColors } from "./themes";

describe("theme colors", () => {
  it("keeps the default theme stable", () => {
    expect(defaultThemeColorId).toBe("gray");
    expect(isThemeColorId(defaultThemeColorId)).toBe(true);
  });

  it("includes gray and custom theme options", () => {
    expect(themeColors.map((theme) => theme.id)).toEqual(
      expect.arrayContaining(["gray", "custom"]),
    );
  });

  it("orders selectable themes with custom last", () => {
    expect(themeColors.map((theme) => theme.id)).toEqual([
      "pink",
      "lavender",
      "mint",
      "cream",
      "lemon",
      "gray",
      "custom",
    ]);
  });

  it("defines gray theme tokens", () => {
    expect(grayThemeTokens).toMatchObject({
      accent: "#8d8a94",
      accentSoft: "#eceaf0",
    });
  });
});
