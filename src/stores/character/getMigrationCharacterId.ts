import { storageKeys } from "../../lib/storage";

export const fallbackMigrationCharacterId = "default-character";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getMigrationCharacterId = () => {
  if (typeof localStorage === "undefined") {
    return fallbackMigrationCharacterId;
  }

  try {
    const raw = localStorage.getItem(storageKeys.characters);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    const state = isRecord(parsed) && isRecord(parsed.state) ? parsed.state : parsed;

    return isRecord(state) && typeof state.activeCharacterId === "string"
      ? state.activeCharacterId
      : fallbackMigrationCharacterId;
  } catch {
    return fallbackMigrationCharacterId;
  }
};
