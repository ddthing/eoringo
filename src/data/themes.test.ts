import { readFileSync } from "node:fs";
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
      accent: "#7e8793",
      accentSoft: "#eaedf1",
    });
  });

  it("defines Mint CSS tokens separately from Gray", () => {
    const globalsCss = readFileSync(
      new URL("../styles/globals.css", import.meta.url),
      "utf8",
    );
    const mintBlock = globalsCss.match(
      /html\[data-theme-color="mint"\]\s*\{([^}]+)\}/,
    )?.[1];
    const grayBlock = globalsCss.match(
      /html\[data-theme-color="gray"\]\s*\{([^}]+)\}/,
    )?.[1];

    expect(mintBlock).toContain("--color-accent: 142 191 130");
    expect(mintBlock).toContain("--color-accent-soft: 232 244 225");
    expect(mintBlock).toContain("--color-accent-ink: 68 116 58");
    expect(mintBlock).not.toBe(grayBlock);
  });

  it("defines dark semantic tokens and dark Mint accents", () => {
    const globalsCss = readFileSync(
      new URL("../styles/globals.css", import.meta.url),
      "utf8",
    );
    const darkBlock = globalsCss.match(
      /html\[data-color-mode="dark"\]\s*\{([^}]+)\}/,
    )?.[1];
    const darkMintBlock = globalsCss.match(
      /html\[data-color-mode="dark"\]\[data-theme-color="mint"\]\s*\{([^}]+)\}/,
    )?.[1];

    expect(darkBlock).toContain("--color-bg: 21 24 29");
    expect(darkBlock).toContain("--color-card: 29 33 39");
    expect(darkMintBlock).toContain("--color-accent-soft: 45 57 49");
    expect(darkMintBlock).toContain("--color-accent-ink: 169 218 158");
  });
});
