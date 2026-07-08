import { storageKeys } from "./storage";

export type BackupPayload = {
  app: "FF14 Daily Board";
  version: 2;
  exportedAt: string;
  data: Record<string, unknown>;
};

export const exportBackup = (): BackupPayload => ({
  app: "FF14 Daily Board",
  version: 2,
  exportedAt: new Date().toISOString(),
  data: Object.fromEntries(
    Object.values(storageKeys).map((key) => {
      const rawValue = localStorage.getItem(key);
      return [key, rawValue ? JSON.parse(rawValue) : null];
    }),
  ),
});
