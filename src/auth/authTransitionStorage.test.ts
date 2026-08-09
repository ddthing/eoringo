import { describe, expect, it } from "vitest";
import {
  authTransitionStorageKey,
  clearAutomaticSyncAttempt,
  getPendingAuthTransition,
  hasAutomaticSyncAttempt,
  isPendingGuestLink,
  markAutomaticSyncAttempt,
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
});
