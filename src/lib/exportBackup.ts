import { storageKeys } from "./storage";

export type BackupPayload = {
  app: "에오링고";
  version: 2;
  exportedAt: string;
  data: Record<string, unknown>;
};

const readBackupValue = (key: string) => {
  try {
    const rawValue = localStorage.getItem(key);

    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
};

export const exportBackup = (): BackupPayload => ({
  app: "에오링고",
  version: 2,
  exportedAt: new Date().toISOString(),
  data: Object.fromEntries(
    Object.values(storageKeys).map((key) => {
      return [key, readBackupValue(key)];
    }),
  ),
});
