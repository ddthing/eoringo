import { getAllCharacterImages } from "./imageStorage";
import { storageKeys } from "./storage";
import {
  isSupportedCharacterImageType,
  maxCharacterImageFileBytes,
} from "../domain/characters/characterImageValidation";

export type BackupImagePayload = {
  type: string;
  dataUrl: string;
};

export type BackupPayload = {
  app: "에오링고";
  version: 7;
  exportedAt: string;
  data: Record<string, unknown>;
  images: Record<string, BackupImagePayload>;
  manifest: {
    storageKeyCount: number;
    imageCount: number;
  };
};

const maxBackupImages = 50;
const maxEncodedImageBytes = 48 * 1024 * 1024;

const readBackupValue = (key: string) => {
  try {
    const rawValue = localStorage.getItem(key);

    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    throw new Error("저장된 기록을 읽지 못해 백업을 중단했습니다. 브라우저 저장 공간을 확인해주세요.");
  }
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("이미지를 백업할 수 없습니다."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 백업할 수 없습니다."));
    reader.readAsDataURL(blob);
  });

const serializeImages = async (images: Record<string, Blob>) => {
  const entries = Object.entries(images);

  if (entries.length > maxBackupImages) {
    throw new Error("백업할 사진이 너무 많습니다.");
  }

  const payloads: Record<string, BackupImagePayload> = {};
  let encodedBytes = 0;

  // Keep conversion sequential so a large local image set cannot allocate all
  // base64 strings at once. The total is bounded before returning the payload.
  for (const [imageId, blob] of entries) {
    if (blob.size > maxCharacterImageFileBytes) {
      throw new Error("백업할 사진의 크기가 너무 큽니다.");
    }

    const type = blob.type || "image/webp";

    if (!isSupportedCharacterImageType(type)) {
      throw new Error("지원하지 않는 사진 형식이 포함되어 있습니다.");
    }

    const dataUrl = await blobToDataUrl(blob);
    encodedBytes += dataUrl.length;

    if (encodedBytes > maxEncodedImageBytes) {
      throw new Error("백업 사진의 전체 크기가 너무 큽니다.");
    }

    payloads[imageId] = { type, dataUrl };
  }

  return payloads;
};

export const exportBackup = async (): Promise<BackupPayload> => {
  const images = await getAllCharacterImages();
  const imagePayloads = await serializeImages(images);

  const data = Object.fromEntries(
    Object.values(storageKeys).map((key) => {
      return [key, readBackupValue(key)];
    }),
  );
  return {
    app: "에오링고",
    version: 7,
    exportedAt: new Date().toISOString(),
    data,
    images: imagePayloads,
    manifest: {
      storageKeyCount: Object.keys(data).length,
      imageCount: Object.keys(imagePayloads).length,
    },
  };
};
