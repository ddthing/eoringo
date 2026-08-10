import { afterEach, describe, expect, it, vi } from "vitest";
import {
  grantSyncConsent,
  hasActiveSyncAccount,
  hasSyncConsent,
  invalidateSyncAccount,
  revokeSyncConsent,
} from "./syncConsent";

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("sync account boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("records the approved account only when sync consent is granted", () => {
    const storage = createStorage();
    const userId = "00000000-0000-4000-8000-000000000021";
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });

    expect(hasSyncConsent(userId, storage)).toBe(false);
    expect(hasActiveSyncAccount(userId, storage)).toBe(false);

    grantSyncConsent(userId, storage, new Date("2026-08-10T00:00:00.000Z"));

    expect(hasSyncConsent(userId, storage)).toBe(true);
    expect(hasActiveSyncAccount(userId, storage)).toBe(true);
  });

  it("invalidates the active account before an account switch", () => {
    const storage = createStorage();
    const userId = "00000000-0000-4000-8000-000000000022";
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });

    grantSyncConsent(userId, storage);
    invalidateSyncAccount(storage);

    expect(hasSyncConsent(userId, storage)).toBe(true);
    expect(hasActiveSyncAccount(userId, storage)).toBe(false);

    revokeSyncConsent(storage);
    expect(hasSyncConsent(userId, storage)).toBe(false);
    expect(hasActiveSyncAccount(userId, storage)).toBe(false);
  });
});
