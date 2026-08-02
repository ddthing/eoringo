import { afterEach, describe, expect, it, vi } from "vitest";
import { exportBackup } from "./exportBackup";
import { getAllCharacterImages } from "./imageStorage";
import { storageKeys } from "./storage";

vi.mock("./imageStorage", () => ({
  getAllCharacterImages: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
  vi.mocked(getAllCharacterImages).mockResolvedValue({});
  vi.unstubAllGlobals();
});

describe("exportBackup", () => {
  it("exports version 7 payloads with persisted History and allowances", async () => {
    const history = { state: { entriesByDate: { "2026-07-01": { date: "2026-07-01" } } }, version: 1 };
    const allowances = { state: { value: 12, lastAccrualKey: "2026-07-12T12:00:00.000Z" }, version: 1 };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) =>
        key === storageKeys.history
          ? JSON.stringify(history)
          : key === storageKeys.allowances
            ? JSON.stringify(allowances)
            : null,
      ),
    });

    const backup = await exportBackup();

    expect(backup.version).toBe(7);
    expect(backup.data[storageKeys.history]).toEqual(history);
    expect(backup.data[storageKeys.allowances]).toEqual(allowances);
  });

  it("exports every persisted storage key and IndexedDB character image", async () => {
    const values = Object.fromEntries(
      Object.values(storageKeys).map((key, index) => [key, { state: { index }, version: 1 }]),
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => JSON.stringify(values[key])),
    });
    vi.mocked(getAllCharacterImages).mockResolvedValueOnce({
      "character-image-test": new Blob(["image"], { type: "image/webp" }),
    });

    class FileReaderMock {
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = null;
      onload: FileReader["onload"] = null;
      onerror: FileReader["onerror"] = null;

      readAsDataURL(blob: Blob) {
        this.result = `data:${blob.type};base64,aW1hZ2U=`;
        this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }
    }

    vi.stubGlobal("FileReader", FileReaderMock);

    const backup = await exportBackup();

    expect(backup.data).toEqual(values);
    expect(backup.images).toEqual({
      "character-image-test": {
        type: "image/webp",
        dataUrl: "data:image/webp;base64,aW1hZ2U=",
      },
    });
    expect(backup.manifest).toEqual({
      storageKeyCount: Object.keys(storageKeys).length,
      imageCount: 1,
    });
  });
});
