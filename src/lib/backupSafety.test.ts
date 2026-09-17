import { describe, expect, it, vi } from "vitest";
import { isSafeBackupData, maxBackupFileBytes, readBackupFile } from "./backupSafety";
import { validateBackupPayload } from "./importBackup";

describe("backup input boundaries", () => {
  it("rejects oversized files before reading them", async () => {
    const text = vi.fn();
    await expect(readBackupFile({ size: maxBackupFileBytes + 1, text })).rejects.toThrow("64MB");
    expect(text).not.toHaveBeenCalled();
  });
  it("reads JSON and gives a useful error for malformed files", async () => {
    await expect(readBackupFile({ size: 2, text: async () => "{}" })).resolves.toEqual({});
    await expect(readBackupFile({ size: 1, text: async () => "{" })).rejects.toThrow("JSON");
  });
  it("preserves nullable persisted state", () => {
    expect(isSafeBackupData({ state: { image: null, items: [1, true, "메모"] } })).toBe(true);
  });
  it.each(["__proto__", "constructor", "prototype"])("rejects nested reserved key %s before restore", (key) => {
    const data = JSON.parse(`{"state":{"${key}":{}}}`);
    expect(() => validateBackupPayload({ app: "에오링고", version: 7, data })).toThrow("구조나 크기");
  });
  it("rejects excessively deep and wide documents", () => {
    let deep: unknown = {};
    for (let i = 0; i < 35; i++) deep = { child: deep };
    expect(isSafeBackupData(deep)).toBe(false);
    expect(isSafeBackupData(Array(10_001).fill(null))).toBe(false);
  });
});
