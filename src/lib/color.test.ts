import { describe, expect, it } from "vitest";
import {
  defaultCustomAccentColor,
  getAccessibleForegroundColor,
  getContrastRatio,
  getSoftAccentColor,
  hexToRgbString,
  isValidHexColor,
  normalizeHexColor,
} from "./color";

describe("color helpers", () => {
  it("validates hex colors", () => {
    expect(isValidHexColor("#8d8a94")).toBe(true);
    expect(isValidHexColor("8D8A94")).toBe(true);
    expect(isValidHexColor("#888")).toBe(false);
    expect(isValidHexColor("not-a-color")).toBe(false);
  });

  it("normalizes valid hex values and falls back for invalid values", () => {
    expect(normalizeHexColor("8D8A94")).toBe("#8d8a94");
    expect(normalizeHexColor("#ABCDEF")).toBe("#abcdef");
    expect(normalizeHexColor("bad")).toBe(defaultCustomAccentColor);
  });

  it("creates rgb css variable values", () => {
    expect(hexToRgbString("#8d8a94")).toBe("141 138 148");
    expect(getSoftAccentColor("#8d8a94")).toBe("234 234 236");
  });

  it("chooses the higher-contrast foreground for custom accents", () => {
    expect(getAccessibleForegroundColor("#f4d75f")).toBe("17 24 32");
    expect(getAccessibleForegroundColor("#202733")).toBe("255 255 255");
    expect(getAccessibleForegroundColor("#777777")).toBe("0 0 0");
    expect(getContrastRatio("#7e8793", "#111820")).toBeGreaterThanOrEqual(4.5);
  });

  it("creates a restrained soft accent for dark surfaces", () => {
    expect(getSoftAccentColor("#ee9ab5", "dark")).toBe("64 50 59");
  });
});
