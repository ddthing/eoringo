import { getAllCharacterImages } from "./imageStorage";
import { storageKeys } from "./storage";

export type BackupImagePayload = {
  type: string;
  dataUrl: string;
};

export type BackupPayload = {
  app: "에오링고";
  version: 6;
  exportedAt: string;
  data: Record<string, unknown>;
  images: Record<string, BackupImagePayload>;
};

const readBackupValue = (key: string) => {
  try {
    const rawValue = localStorage.getItem(key);

    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
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

export const exportBackup = async (): Promise<BackupPayload> => {
  const images = await getAllCharacterImages();
  const imagePayloadEntries = await Promise.all(
    Object.entries(images).map(async ([imageId, blob]) => [
      imageId,
      {
        type: blob.type || "image/webp",
        dataUrl: await blobToDataUrl(blob),
      },
    ] as const),
  );

  return {
    app: "에오링고",
    version: 6,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(
      Object.values(storageKeys).map((key) => {
        return [key, readBackupValue(key)];
      }),
    ),
    images: Object.fromEntries(imagePayloadEntries),
  };
};
