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
  it("exports version 6 payloads with persisted History and allowances", async () => {
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

    expect(backup.version).toBe(6);
    expect(backup.data[storageKeys.history]).toEqual(history);
    expect(backup.data[storageKeys.allowances]).toEqual(allowances);
  });
});
