import { clearCharacterImages, saveCharacterImageById } from "./imageStorage";
import { storageKeys } from "./storage";

type BackupImagePayload = {
  type: string;
  dataUrl: string;
};

type SupportedBackupPayload = {
  app: "에오링고" | "FF14 Daily Board";
  version: 1 | 2 | 3;
  exportedAt: string;
  data: Record<string, unknown>;
  images?: Record<string, BackupImagePayload>;
};

const knownKeys = new Set<string>(Object.values(storageKeys));
const supportedAppNames = new Set(["에오링고", "FF14 Daily Board"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isBackupImagePayload = (value: unknown): value is BackupImagePayload =>
  isRecord(value) && typeof value.type === "string" && typeof value.dataUrl === "string";

const normalizeImages = (images: unknown) => {
  if (images === undefined) {
    return undefined;
  }

  if (!isRecord(images)) {
    throw new Error("백업 이미지 데이터가 올바르지 않습니다.");
  }

  return Object.fromEntries(
    Object.entries(images).filter(
      (entry): entry is [string, BackupImagePayload] =>
        typeof entry[0] === "string" && isBackupImagePayload(entry[1]),
    ),
  );
};

export const validateBackupPayload = (payload: unknown): SupportedBackupPayload => {
  if (!isRecord(payload)) {
    throw new Error("백업 파일 형식이 올바르지 않습니다.");
  }

  if (
    typeof payload.app !== "string" ||
    !supportedAppNames.has(payload.app) ||
    ![1, 2, 3].includes(Number(payload.version))
  ) {
    throw new Error("지원하지 않는 백업 파일입니다.");
  }

  if (!isRecord(payload.data)) {
    throw new Error("백업 파일에 복원할 데이터가 없습니다.");
  }

  return {
    app: payload.app as SupportedBackupPayload["app"],
    version: Number(payload.version) as 1 | 2 | 3,
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

  return blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: image.type });
};

export const importBackup = async (payload: unknown) => {
  const backup = validateBackupPayload(payload);

  Object.entries(backup.data).forEach(([key, value]) => {
    if (!knownKeys.has(key)) {
      return;
    }

    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      throw new Error("복원 데이터를 저장할 수 없습니다. 브라우저 저장 공간을 확인해주세요.");
    }
  });

  if (!backup.images) {
    return;
  }

  await clearCharacterImages();

  await Promise.all(
    Object.entries(backup.images).map(async ([imageId, image]) => {
      const blob = await dataUrlToBlob(image);
      await saveCharacterImageById(imageId, blob);
    }),
  );
};
