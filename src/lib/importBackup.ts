import { getAllCharacterImages, replaceCharacterImages } from "./imageStorage";
import { storageKeys } from "./storage";

type BackupImagePayload = {
  type: string;
  dataUrl: string;
};

type SupportedBackupPayload = {
  app: "에오링고" | "FF14 Daily Board";
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  exportedAt: string;
  data: Record<string, unknown>;
  images?: Record<string, BackupImagePayload>;
};

const knownKeys = new Set<string>(Object.values(storageKeys));
const supportedAppNames = new Set(["에오링고", "FF14 Daily Board"]);
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBackupImages = 50;
const maxEncodedImageLength = 28 * 1024 * 1024;
const maxDecodedImageBytes = 20 * 1024 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBackupImagePayload = (value: unknown): value is BackupImagePayload =>
  isRecord(value) &&
  typeof value.type === "string" &&
  supportedImageTypes.has(value.type) &&
  typeof value.dataUrl === "string" &&
  value.dataUrl.length <= maxEncodedImageLength &&
  value.dataUrl.startsWith(`data:${value.type};base64,`);

const normalizeImages = (images: unknown) => {
  if (images === undefined) {
    return undefined;
  }

  if (!isRecord(images)) {
    throw new Error("백업 이미지 데이터가 올바르지 않습니다.");
  }

  const entries = Object.entries(images);

  if (
    entries.length > maxBackupImages ||
    entries.some(
      ([imageId, image]) =>
        imageId.length < 1 ||
        imageId.length > 128 ||
        ["__proto__", "constructor", "prototype"].includes(imageId) ||
        !isBackupImagePayload(image),
    )
  ) {
    throw new Error("백업 이미지 데이터가 올바르지 않습니다.");
  }

  return Object.fromEntries(entries) as Record<string, BackupImagePayload>;
};

export const validateBackupPayload = (payload: unknown): SupportedBackupPayload => {
  if (!isRecord(payload)) {
    throw new Error("백업 파일 형식이 올바르지 않습니다.");
  }

  if (
    typeof payload.app !== "string" ||
    !supportedAppNames.has(payload.app) ||
    ![1, 2, 3, 4, 5, 6, 7].includes(Number(payload.version))
  ) {
    throw new Error("지원하지 않는 백업 파일입니다.");
  }

  if (!isRecord(payload.data)) {
    throw new Error("백업 파일에 복원할 데이터가 없습니다.");
  }

  return {
    app: payload.app as SupportedBackupPayload["app"],
    version: Number(payload.version) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : "",
    data: payload.data,
    images: normalizeImages(payload.images),
  };
};

const dataUrlToBlob = async (image: BackupImagePayload) => {
  const response = await fetch(image.dataUrl);

  if (!response.ok) {
    throw new Error("백업 이미지를 읽을 수 없습니다.");
  }

  const blob = await response.blob();

  if (!supportedImageTypes.has(blob.type || image.type) || blob.size > maxDecodedImageBytes) {
    throw new Error("백업 이미지의 형식 또는 크기가 올바르지 않습니다.");
  }

  return blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: image.type });
};

const restoreStorageSnapshot = (snapshot: Map<string, string | null>) => {
  let failed = false;

  snapshot.forEach((value, key) => {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      failed = true;
    }
  });

  return !failed;
};

export const importBackup = async (payload: unknown) => {
  const backup = validateBackupPayload(payload);
  const storageEntries = Object.entries(backup.data).filter(([key]) => knownKeys.has(key));
  const storageSnapshot = new Map(
    storageEntries.map(([key]) => [key, localStorage.getItem(key)] as const),
  );
  const restoredImages = backup.images
    ? Object.fromEntries(
        await Promise.all(
          Object.entries(backup.images).map(async ([imageId, image]) => [
            imageId,
            await dataUrlToBlob(image),
          ] as const),
        ),
      )
    : undefined;
  const previousImages = backup.images ? await getAllCharacterImages() : undefined;

  let replacingImages = false;

  try {
    storageEntries.forEach(([key, value]) => {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    if (restoredImages && previousImages) {
      replacingImages = true;
      await replaceCharacterImages(restoredImages);
      replacingImages = false;
    }
  } catch (error) {
    const storageRestored = restoreStorageSnapshot(storageSnapshot);

    if (replacingImages && previousImages) {
      try {
        await replaceCharacterImages(previousImages);
      } catch {
        // Keep the original restore failure as the user-facing error.
      }
    }

    if (!storageRestored) {
      throw new Error("복원 상태를 되돌릴 수 없습니다. 브라우저 저장 공간을 확인해주세요.");
    }

    if (replacingImages) {
      throw new Error("캐릭터 사진을 복원할 수 없습니다.");
    }

    if (error instanceof Error && error.message.includes("저장할 수 없습니다")) {
      throw error;
    }

    throw new Error("복원 데이터를 저장할 수 없습니다. 브라우저 저장 공간을 확인해주세요.");
  }
};
