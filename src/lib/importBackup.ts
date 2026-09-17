import { replaceCharacterImages } from "./imageStorage";
import { storageKeys } from "./storage";
import { isSafeBackupData } from "./backupSafety";

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

  if (entries.reduce((size, [, image]) => size + (image as BackupImagePayload).dataUrl.length, 0) > 48 * 1024 * 1024) {
    throw new Error("백업 이미지의 전체 크기가 너무 큽니다.");
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

  if (!isSafeBackupData(payload.data)) {
    throw new Error("백업 데이터의 구조나 크기가 올바르지 않습니다.");
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
  let decoded: string;
  try {
    // Decode locally: fetch(data:) is blocked by the production connect-src
    // policy and needlessly sends an in-memory image through the fetch stack.
    decoded = atob(image.dataUrl.slice(image.dataUrl.indexOf(",") + 1));
  } catch {
    throw new Error("백업 이미지를 읽을 수 없습니다.");
  }
  if (decoded.length === 0 || decoded.length > maxDecodedImageBytes) {
    throw new Error("백업 이미지의 형식 또는 크기가 올바르지 않습니다.");
  }
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return new Blob([bytes], { type: image.type });
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

const captureStorageSnapshot = (entries: Array<[string, unknown]>) => {
  try {
    return new Map(entries.map(([key]) => [key, localStorage.getItem(key)] as const));
  } catch {
    throw new Error("저장된 기록을 읽지 못해 복원을 시작할 수 없습니다.");
  }
};

export const importBackup = async (payload: unknown) => {
  const backup = validateBackupPayload(payload);
  const storageEntries = Object.entries(backup.data).filter(([key]) => knownKeys.has(key));
  const storageSnapshot = captureStorageSnapshot(storageEntries);
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

  let replacingImages = false;

  try {
    storageEntries.forEach(([key, value]) => {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    if (restoredImages) {
      replacingImages = true;
      await replaceCharacterImages(restoredImages);
      replacingImages = false;
    }
  } catch (error) {
    const storageRestored = restoreStorageSnapshot(storageSnapshot);

    // Image replacement is one atomic IndexedDB transaction. An abort keeps
    // the original images; rewriting a stale snapshot could overwrite another tab.

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
