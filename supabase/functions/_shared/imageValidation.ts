export const characterImageBucket = "character-images";
export const maxCharacterImageBytes = 512 * 1024;
export const maxCharacterImageDimension = 768;
export const maxCharacterImageStorageBytes = 10 * 1024 * 1024;
export const maxCharacterImagesPerUser = 50;

export const supportedCharacterImageTypes = [
  "image/webp",
  "image/jpeg",
  "image/png",
] as const;

export type CharacterImageType = (typeof supportedCharacterImageTypes)[number];

export type ImageInspection = {
  contentType: CharacterImageType;
  width: number;
  height: number;
  bytes: number;
};

const imageIdPattern = /^character-image-[a-z0-9-]{1,108}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const equalBytes = (bytes: Uint8Array, offset: number, expected: number[]) =>
  expected.every((value, index) => bytes[offset + index] === value);

const readUint16BE = (bytes: Uint8Array, offset: number) =>
  (bytes[offset] << 8) | bytes[offset + 1];

const readUint24LE = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);

const validDimensions = (width: number, height: number) =>
  Number.isInteger(width) &&
  Number.isInteger(height) &&
  width > 0 &&
  height > 0 &&
  width <= maxCharacterImageDimension &&
  height <= maxCharacterImageDimension;

const readPngDimensions = (bytes: Uint8Array) => {
  if (
    bytes.length < 24 ||
    !equalBytes(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10]) ||
    !equalBytes(bytes, 12, [73, 72, 68, 82])
  ) {
    return null;
  }

  const width =
    bytes[16] * 0x1000000 +
    bytes[17] * 0x10000 +
    bytes[18] * 0x100 +
    bytes[19];
  const height =
    bytes[20] * 0x1000000 +
    bytes[21] * 0x10000 +
    bytes[22] * 0x100 +
    bytes[23];

  return validDimensions(width, height) ? { width, height } : null;
};

const jpegStartOfFrameMarkers = new Set([
  0xc0,
  0xc1,
  0xc2,
  0xc3,
  0xc5,
  0xc6,
  0xc7,
  0xc9,
  0xca,
  0xcb,
  0xcd,
  0xce,
  0xcf,
]);

const readJpegDimensions = (bytes: Uint8Array) => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (marker === 0xda || marker === 0x01 || offset + 1 >= bytes.length) {
      return null;
    }

    const segmentLength = readUint16BE(bytes, offset);

    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (jpegStartOfFrameMarkers.has(marker)) {
      if (offset + 6 >= bytes.length) {
        return null;
      }

      const height = readUint16BE(bytes, offset + 3);
      const width = readUint16BE(bytes, offset + 5);

      return validDimensions(width, height) ? { width, height } : null;
    }

    offset += segmentLength;
  }

  return null;
};

const readWebpDimensions = (bytes: Uint8Array) => {
  if (
    bytes.length < 20 ||
    !equalBytes(bytes, 0, [82, 73, 70, 70]) ||
    !equalBytes(bytes, 8, [87, 69, 66, 80])
  ) {
    return null;
  }

  if (equalBytes(bytes, 12, [86, 80, 56, 88]) && bytes.length >= 30) {
    const width = 1 + readUint24LE(bytes, 24);
    const height = 1 + readUint24LE(bytes, 27);

    return validDimensions(width, height) ? { width, height } : null;
  }

  if (equalBytes(bytes, 12, [86, 80, 56, 32]) && bytes.length >= 30) {
    const frameHeader = 20;

    if (
      !equalBytes(bytes, frameHeader + 3, [157, 1, 42])
    ) {
      return null;
    }

    const width = bytes[frameHeader + 6] | (bytes[frameHeader + 7] << 8);
    const height = bytes[frameHeader + 8] | (bytes[frameHeader + 9] << 8);

    return validDimensions(width & 0x3fff, height & 0x3fff)
      ? { width: width & 0x3fff, height: height & 0x3fff }
      : null;
  }

  if (equalBytes(bytes, 12, [86, 80, 56, 76]) && bytes.length >= 25 && bytes[20] === 0x2f) {
    const width = 1 + (bytes[21] | ((bytes[22] & 0x3f) << 8));
    const height = 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10));

    return validDimensions(width, height) ? { width, height } : null;
  }

  return null;
};

export const isSafeCharacterImageId = (value: unknown): value is string =>
  typeof value === "string" && imageIdPattern.test(value);

export const isUserId = (value: unknown): value is string =>
  typeof value === "string" && uuidPattern.test(value);

export const buildCharacterImagePath = (userId: string, imageId: string) => {
  if (!isUserId(userId) || !isSafeCharacterImageId(imageId)) {
    throw new Error("Invalid character image path.");
  }

  return `${userId}/${imageId}`;
};

export const inspectCharacterImage = (
  bytes: Uint8Array,
  declaredContentType?: string,
): ImageInspection | null => {
  if (bytes.length === 0 || bytes.length > maxCharacterImageBytes) {
    return null;
  }

  const detected = equalBytes(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])
    ? "image/png"
    : bytes[0] === 0xff && bytes[1] === 0xd8
      ? "image/jpeg"
      : equalBytes(bytes, 0, [82, 73, 70, 70]) && equalBytes(bytes, 8, [87, 69, 66, 80])
        ? "image/webp"
        : null;

  if (!detected || (declaredContentType && declaredContentType !== detected)) {
    return null;
  }

  const dimensions =
    detected === "image/png"
      ? readPngDimensions(bytes)
      : detected === "image/jpeg"
        ? readJpegDimensions(bytes)
        : readWebpDimensions(bytes);

  if (!dimensions) {
    return null;
  }

  return {
    contentType: detected,
    width: dimensions.width,
    height: dimensions.height,
    bytes: bytes.length,
  };
};

export const decodeBase64 = (value: string) => {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    return null;
  }

  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return bytes.length > 0 && bytes.length <= maxCharacterImageBytes ? bytes : null;
  } catch {
    return null;
  }
};
