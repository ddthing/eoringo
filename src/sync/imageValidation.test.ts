import { describe, expect, it } from "vitest";
import {
  buildCharacterImagePath,
  inspectCharacterImage,
  isSafeCharacterImageId,
  validateCharacterImageBlob,
} from "./imageValidation";

const png64 = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 64, 0, 0, 0, 64,
]);

const jpeg64 = new Uint8Array([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x40, 0x00, 0x40, 0, 0, 0, 0,
]);

const webp64 = new Uint8Array([
  82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80,
  86, 80, 56, 88, 10, 0, 0, 0, 0, 0, 0, 0,
  63, 0, 0, 63, 0, 0,
]);

describe("character image validation", () => {
  it.each([
    [png64, "image/png", "image/png"],
    [jpeg64, "image/jpeg", "image/jpeg"],
    [webp64, "image/webp", "image/webp"],
  ])("accepts a bounded %s image signature", (bytes, type, contentType) => {
    expect(inspectCharacterImage(bytes, type)).toMatchObject({
      contentType,
      width: 64,
      height: 64,
      bytes: bytes.length,
    });
  });

  it("rejects a MIME mismatch, unsupported signature, and oversized dimensions", () => {
    expect(inspectCharacterImage(png64, "image/jpeg")).toBeNull();
    expect(inspectCharacterImage(new Uint8Array([1, 2, 3]), "image/png")).toBeNull();

    const oversizedPng = new Uint8Array(png64);
    oversizedPng[16] = 4;
    expect(inspectCharacterImage(oversizedPng, "image/png")).toBeNull();
  });

  it("keeps image IDs and storage paths inside the account namespace", () => {
    const imageId = "character-image-0123456789abcdef-0123456789abcdef";

    expect(isSafeCharacterImageId(imageId)).toBe(true);
    expect(isSafeCharacterImageId("../other-user/image")).toBe(false);
    expect(buildCharacterImagePath("00000000-0000-4000-8000-000000000001", imageId)).toBe(
      `00000000-0000-4000-8000-000000000001/${imageId}`,
    );
    expect(() => buildCharacterImagePath("not-a-user", imageId)).toThrow();
  });

  it("normalizes a blob only after validating its actual bytes", async () => {
    const validated = await validateCharacterImageBlob(new Blob([png64], { type: "image/png" }));

    expect(validated.inspection.contentType).toBe("image/png");
    expect(validated.blob.size).toBe(png64.length);
  });
});
