import { describe, expect, it } from "vitest";
import {
  authTransitionStorageKey,
  clearAutomaticSyncAttempt,
  clearIdentityConflictRecovery,
  getPendingAuthTransition,
  hasAutomaticSyncAttempt,
  hasIdentityConflictRecovery,
  identityConflictRecoveryStorageKey,
  isPendingGuestLink,
  markAutomaticSyncAttempt,
  markIdentityConflictRecovery,
  markPendingAccountSwitch,
  markPendingGuestLink,
} from "./authTransitionStorage";

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("auth transition storage", () => {
  it("keeps a guest link bound to the original user", () => {
    const storage = createStorage();

    markPendingGuestLink("guest-id", storage);

    expect(isPendingGuestLink("guest-id", storage)).toBe(true);
    expect(getPendingAuthTransition(storage)).toMatchObject({
      kind: "guest-link",
      userId: "guest-id",
    });
    expect(storage.getItem(authTransitionStorageKey)).toContain("guest-id");
  });

  it("records account switch transitions and bounds automatic attempts", () => {
    const storage = createStorage();

    markPendingAccountSwitch(storage);
    expect(getPendingAuthTransition(storage)).toMatchObject({ kind: "account-switch" });
    expect(hasAutomaticSyncAttempt("user-id", storage)).toBe(false);

    markAutomaticSyncAttempt("user-id", storage);
    expect(hasAutomaticSyncAttempt("user-id", storage)).toBe(true);
    clearAutomaticSyncAttempt("user-id", storage);
    expect(hasAutomaticSyncAttempt("user-id", storage)).toBe(false);
  });

  it("bounds automatic identity-conflict recovery to one short-lived attempt", () => {
    const storage = createStorage();

    expect(hasIdentityConflictRecovery(storage)).toBe(false);
    markIdentityConflictRecovery(storage);
    expect(hasIdentityConflictRecovery(storage)).toBe(true);

    clearIdentityConflictRecovery(storage);
    expect(hasIdentityConflictRecovery(storage)).toBe(false);
  });

  it("cleans malformed and expired identity-conflict recovery markers", () => {
    const storage = createStorage();

    storage.setItem(
      identityConflictRecoveryStorageKey,
      JSON.stringify({ createdAt: new Date(Date.now() - 16 * 60 * 1000).toISOString() }),
    );
    expect(hasIdentityConflictRecovery(storage)).toBe(false);
    expect(storage.getItem(identityConflictRecoveryStorageKey)).toBeNull();

    storage.setItem(identityConflictRecoveryStorageKey, "{invalid");
    expect(hasIdentityConflictRecovery(storage)).toBe(false);
    expect(storage.getItem(identityConflictRecoveryStorageKey)).toBeNull();
  });
});
