export const supportedCharacterImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const maxCharacterImageFileBytes = 20 * 1024 * 1024;
export const maxCharacterImagePixels = 25_000_000;

export const isSupportedCharacterImageType = (type: string) =>
  (supportedCharacterImageTypes as readonly string[]).includes(type);

export const isSafeCharacterImageDimensions = (width: number, height: number) =>
  Number.isInteger(width) &&
  Number.isInteger(height) &&
  width > 0 &&
  height > 0 &&
  width * height <= maxCharacterImagePixels;
