import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importBackup, validateBackupPayload } from "./importBackup";
import {
  getAllCharacterImages,
  replaceCharacterImages,
} from "./imageStorage";
import { storageKeys } from "./storage";

vi.mock("./imageStorage", () => ({
  clearCharacterImages: vi.fn().mockResolvedValue(undefined),
  getAllCharacterImages: vi.fn().mockResolvedValue({}),
  replaceCharacterImages: vi.fn().mockResolvedValue(undefined),
}));

describe("validateBackupPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("accepts current backup payloads", () => {
    expect(
      validateBackupPayload({
        app: "에오링고",
        version: 6,
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
      version: 6,
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

  it.each([1, 2, 3, 4, 5])("keeps backup version %i compatible", (version) => {
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

  it("rejects remote or mismatched image URLs in backup files", () => {
    expect(() =>
      validateBackupPayload({
        app: "에오링고",
        version: 7,
        exportedAt: "",
        data: {},
        images: {
          image: { type: "image/webp", dataUrl: "https://attacker.example/image.webp" },
        },
      }),
    ).toThrow("백업 이미지 데이터가 올바르지 않습니다.");

    expect(() =>
      validateBackupPayload({
        app: "에오링고",
        version: 7,
        exportedAt: "",
        data: {},
        images: {
          image: { type: "image/png", dataUrl: "data:image/webp;base64,aW1hZ2U=" },
        },
      }),
    ).toThrow("백업 이미지 데이터가 올바르지 않습니다.");
  });

  it("restores History from version 5 backups", async () => {
    const history = { state: { entriesByDate: {} }, version: 1 };
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem, removeItem: vi.fn() });

    await importBackup({
      app: "에오링고",
      version: 5,
      exportedAt: "2026-07-11T00:00:00.000Z",
      data: { [storageKeys.history]: history },
    });

    expect(setItem).toHaveBeenCalledWith(storageKeys.history, JSON.stringify(history));
  });

  it("restores allowances from version 6 backups", async () => {
    const allowances = { state: { value: 21, lastAccrualKey: "2026-07-12T12:00:00.000Z" }, version: 1 };
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem, removeItem: vi.fn() });

    await importBackup({
      app: "에오링고",
      version: 6,
      exportedAt: "2026-07-12T12:00:00.000Z",
      data: { [storageKeys.allowances]: allowances },
    });

    expect(setItem).toHaveBeenCalledWith(storageKeys.allowances, JSON.stringify(allowances));
  });

  it("restores every known storage key and character image", async () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    const values = Object.fromEntries(
      Object.values(storageKeys).map((key, index) => [key, { state: { index }, version: 1 }]),
    );
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem, removeItem });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["image"], { type: "image/webp" }), { status: 200 }),
      ),
    );

    await importBackup({
      app: "FF14 Daily Board",
      version: 6,
      exportedAt: "2026-08-01T00:00:00.000Z",
      data: values,
      images: {
        "character-image-test": {
          type: "image/webp",
          dataUrl: "data:image/webp;base64,aW1hZ2U=",
        },
      },
    });

    Object.entries(values).forEach(([key, value]) => {
      expect(setItem).toHaveBeenCalledWith(key, JSON.stringify(value));
    });
    expect(replaceCharacterImages).toHaveBeenCalledWith({
      "character-image-test": expect.objectContaining({ type: "image/webp" }),
    });
    expect(vi.mocked(replaceCharacterImages)).toHaveBeenCalledOnce();
  });

  it("rolls back local storage when a restore write fails", async () => {
    const existingValues = new Map<string, string>([[storageKeys.history, "old-history"]]);
    const getItem = vi.fn((key: string) => existingValues.get(key) ?? null);
    const setItem = vi
      .fn()
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error("quota exceeded");
      });
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });

    await expect(
      importBackup({
        app: "에오링고",
        version: 7,
        exportedAt: "",
        data: {
          [storageKeys.history]: { state: { entriesByDate: {} }, version: 1 },
          [storageKeys.weeklyMemo]: { state: { memo: "new" }, version: 1 },
        },
      }),
    ).rejects.toThrow("복원 데이터를 저장할 수 없습니다.");

    expect(setItem).toHaveBeenCalledWith(storageKeys.history, "old-history");
  });

  it("restores the previous image set when the replacement transaction fails", async () => {
    const previousImages = { "old-image": new Blob(["old"], { type: "image/webp" }) };
    vi.mocked(getAllCharacterImages).mockResolvedValue(previousImages);
    vi.mocked(replaceCharacterImages)
      .mockRejectedValueOnce(new Error("image quota exceeded"))
      .mockResolvedValueOnce(undefined);
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem, removeItem });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["new"], { type: "image/webp" }), { status: 200 }),
      ),
    );

    await expect(
      importBackup({
        app: "에오링고",
        version: 7,
        exportedAt: "",
        data: { [storageKeys.history]: { state: { entriesByDate: {} }, version: 1 } },
        images: {
          "new-image": { type: "image/webp", dataUrl: "data:image/webp;base64,bmV3" },
        },
      }),
    ).rejects.toThrow("캐릭터 사진을 복원할 수 없습니다.");

    expect(replaceCharacterImages).toHaveBeenNthCalledWith(2, previousImages);
    expect(removeItem).toHaveBeenCalledWith(storageKeys.history);
  });
});
