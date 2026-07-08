import { describe, expect, it } from "vitest";
import { validateBackupPayload } from "./importBackup";
import { storageKeys } from "./storage";

describe("validateBackupPayload", () => {
  it("accepts current backup payloads", () => {
    expect(
      validateBackupPayload({
        app: "에오링고",
        version: 2,
        exportedAt: "2026-07-08T00:00:00.000Z",
        data: {
          [storageKeys.weeklyMemo]: { state: { memo: "이번 주 메모" }, version: 1 },
        },
      }),
    ).toMatchObject({
      app: "에오링고",
      version: 2,
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

  it("rejects malformed payloads with user-facing errors", () => {
    expect(() => validateBackupPayload(null)).toThrow("백업 파일 형식이 올바르지 않습니다.");
    expect(() => validateBackupPayload({ app: "다른 앱", version: 2, data: {} })).toThrow(
      "지원하지 않는 백업 파일입니다.",
    );
    expect(() => validateBackupPayload({ app: "에오링고", version: 2 })).toThrow(
      "백업 파일에 복원할 데이터가 없습니다.",
    );
  });
});
