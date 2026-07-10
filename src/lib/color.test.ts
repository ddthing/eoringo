import { describe, expect, it } from "vitest";
import {
  defaultCustomAccentColor,
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
});
