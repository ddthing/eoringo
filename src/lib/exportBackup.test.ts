import { afterEach, describe, expect, it, vi } from "vitest";
import { exportBackup } from "./exportBackup";
import { storageKeys } from "./storage";

vi.mock("./imageStorage", () => ({
  getAllCharacterImages: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("exportBackup", () => {
  it("exports version 5 payloads with persisted History", async () => {
    const history = { state: { entriesByDate: { "2026-07-01": { date: "2026-07-01" } } }, version: 1 };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => (key === storageKeys.history ? JSON.stringify(history) : null)),
    });

    const backup = await exportBackup();

    expect(backup.version).toBe(5);
    expect(backup.data[storageKeys.history]).toEqual(history);
  });
});
