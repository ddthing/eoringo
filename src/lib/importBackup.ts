import { storageKeys } from "./storage";

type SupportedBackupPayload = {
  app: "에오링고" | "FF14 Daily Board";
  version: 1 | 2;
  exportedAt: string;
  data: Record<string, unknown>;
};

const knownKeys = new Set<string>(Object.values(storageKeys));
const supportedAppNames = new Set(["에오링고", "FF14 Daily Board"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateBackupPayload = (payload: unknown): SupportedBackupPayload => {
  if (!isRecord(payload)) {
    throw new Error("백업 파일 형식이 올바르지 않습니다.");
  }

  if (
    typeof payload.app !== "string" ||
    !supportedAppNames.has(payload.app) ||
    ![1, 2].includes(Number(payload.version))
  ) {
    throw new Error("지원하지 않는 백업 파일입니다.");
  }

  if (!isRecord(payload.data)) {
    throw new Error("백업 파일에 복원할 데이터가 없습니다.");
  }

  return {
    app: payload.app as SupportedBackupPayload["app"],
    version: Number(payload.version) as 1 | 2,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : "",
    data: payload.data,
  };
};

export const importBackup = (payload: unknown) => {
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
};
