import { afterEach, describe, expect, it, vi } from "vitest";
import { importBackup, validateBackupPayload } from "./importBackup";
import { storageKeys } from "./storage";

describe("validateBackupPayload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("accepts current backup payloads", () => {
    expect(
      validateBackupPayload({
        app: "에오링고",
        version: 5,
        exportedAt: "2026-07-08T00:00:00.000Z",
        data: {
          [storageKeys.weeklyMemo]: { state: { memo: "이번 주 메모" }, version: 1 },
          [storageKeys.history]: { state: { entriesByDate: {} }, version: 1 },
        },
        images: {
          "character-image-test": {
            type: "image/webp",
            dataUrl: "data:image/webp;base64,test",
          },
        },
      }),
    ).toMatchObject({
      app: "에오링고",
      version: 5,
    });
  });

  it("accepts legacy app names for old backups", () => {
    expect(
      validateBackupPayload({
        app: "FF14 Daily Board",
        version: 1,
        exportedAt: "",
        data: {},
      }),
    ).toMatchObject({
      app: "FF14 Daily Board",
      version: 1,
    });
  });

  it.each([1, 2, 3, 4])("keeps backup version %i compatible", (version) => {
    expect(
      validateBackupPayload({ app: "에오링고", version, exportedAt: "", data: {} }),
    ).toMatchObject({ version });
  });

  it("rejects malformed payloads with user-facing errors", () => {
    expect(() => validateBackupPayload(null)).toThrow("백업 파일 형식이 올바르지 않습니다.");
    expect(() => validateBackupPayload({ app: "다른 앱", version: 2, data: {} })).toThrow(
      "지원하지 않는 백업 파일입니다.",
    );
    expect(() => validateBackupPayload({ app: "에오링고", version: 2 })).toThrow(
      "백업 파일에 복원할 데이터가 없습니다.",
    );
  });

  it("restores History from version 5 backups", async () => {
    const history = { state: { entriesByDate: {} }, version: 1 };
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { setItem, removeItem: vi.fn() });

    await importBackup({
      app: "에오링고",
      version: 5,
      exportedAt: "2026-07-11T00:00:00.000Z",
      data: { [storageKeys.history]: history },
    });

    expect(setItem).toHaveBeenCalledWith(storageKeys.history, JSON.stringify(history));
  });
});
