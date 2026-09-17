import { describe, expect, it } from "vitest";
import {
  isSafeCharacterImageDimensions,
  isSupportedCharacterImageType,
  maxCharacterImageFileBytes,
  maxCharacterImagePixels,
} from "./characterImageValidation";

describe("character image validation", () => {
  it("allows only raster formats that are decoded into a fresh canvas", () => {
    expect(isSupportedCharacterImageType("image/jpeg")).toBe(true);
    expect(isSupportedCharacterImageType("image/png")).toBe(true);
    expect(isSupportedCharacterImageType("image/webp")).toBe(true);
    expect(isSupportedCharacterImageType("image/gif")).toBe(true);
    expect(isSupportedCharacterImageType("image/svg+xml")).toBe(false);
    expect(isSupportedCharacterImageType("image/avif")).toBe(false);
  });

  it("bounds both compressed input and decoded pixel work", () => {
    expect(maxCharacterImageFileBytes).toBe(20 * 1024 * 1024);
    expect(isSafeCharacterImageDimensions(5000, 5000)).toBe(true);
    expect(isSafeCharacterImageDimensions(5001, 5000)).toBe(false);
    expect(isSafeCharacterImageDimensions(0, 100)).toBe(false);
    expect(isSafeCharacterImageDimensions(1.5, 100)).toBe(false);
    expect(maxCharacterImagePixels).toBe(25_000_000);
  });
});
