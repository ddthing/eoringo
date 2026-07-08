import type { BackupPayload } from "./exportBackup";
import { storageKeys } from "./storage";

type SupportedBackupPayload = Omit<BackupPayload, "version"> & {
  version: 1 | 2;
};

const knownKeys = new Set<string>(Object.values(storageKeys));

export const importBackup = (payload: SupportedBackupPayload) => {
  if (payload.app !== "FF14 Daily Board" || ![1, 2].includes(payload.version)) {
    throw new Error("지원하지 않는 백업 파일입니다.");
  }

  Object.entries(payload.data).forEach(([key, value]) => {
    if (!knownKeys.has(key)) {
      return;
    }

    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  });
};
