export const syncConsentStorageKey = "eoringo/sync-consent-v1";
export const syncActiveAccountStorageKey = "eoringo/sync-active-account-v1";
export const syncConsentEvent = "eoringo:sync-consent-changed";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const hasSyncConsent = (userId: string, storage: StorageLike = localStorage) => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(syncConsentStorageKey) ?? "null");

    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      parsed.userId === userId &&
      "acceptedAt" in parsed &&
      typeof parsed.acceptedAt === "string"
    );
  } catch {
    return false;
  }
};

export const grantSyncConsent = (
  userId: string,
  storage: StorageLike = localStorage,
  acceptedAt = new Date(),
) => {
  storage.setItem(
    syncConsentStorageKey,
    JSON.stringify({ userId, acceptedAt: acceptedAt.toISOString() }),
  );
  storage.setItem(
    syncActiveAccountStorageKey,
    JSON.stringify({ userId, approvedAt: acceptedAt.toISOString() }),
  );
  window.dispatchEvent(new Event(syncConsentEvent));
};

export const hasActiveSyncAccount = (
  userId: string,
  storage: StorageLike = localStorage,
) => {
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(syncActiveAccountStorageKey) ?? "null",
    );

    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      parsed.userId === userId &&
      "approvedAt" in parsed &&
      typeof parsed.approvedAt === "string"
    );
  } catch {
    return false;
  }
};

export const invalidateSyncAccount = (
  storage: StorageLike = localStorage,
) => {
  storage.removeItem(syncActiveAccountStorageKey);
};

export const revokeSyncConsent = (
  storage: StorageLike = localStorage,
) => {
  storage.removeItem(syncConsentStorageKey);
  storage.removeItem(syncActiveAccountStorageKey);
  window.dispatchEvent(new Event(syncConsentEvent));
};
