import { describe, expect, it } from "vitest";
import {
  calculateContainDimensions,
  getCompressionAttempts,
  maxCharacterImageBytes,
  maxCharacterImageDimension,
} from "./resizeImage";

describe("secure character image bounds", () => {
  it("contains landscape and portrait images within 768 pixels", () => {
    expect(calculateContainDimensions(2000, 1000, maxCharacterImageDimension)).toEqual({
      width: 768,
      height: 384,
    });
    expect(calculateContainDimensions(1000, 2000, maxCharacterImageDimension)).toEqual({
      width: 384,
      height: 768,
    });
  });

  it("uses a finite, monotonically stricter compression schedule", () => {
    const attempts = getCompressionAttempts();

    expect(attempts).toHaveLength(8);
    attempts.forEach((attempt, index) => {
      expect(attempt.maxDimension).toBeLessThanOrEqual(maxCharacterImageDimension);
      expect(attempt.quality).toBeGreaterThanOrEqual(0.5);

      if (index > 0) {
        expect(attempt.maxDimension).toBeLessThanOrEqual(attempts[index - 1].maxDimension);
        expect(attempt.quality).toBeLessThanOrEqual(attempts[index - 1].quality);
      }
    });
  });

  it("keeps the remote upload byte limit at 512 KiB", () => {
    expect(maxCharacterImageBytes).toBe(524_288);
  });
});
