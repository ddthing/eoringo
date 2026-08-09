export const authTransitionStorageKey = "eoringo/auth-transition-v1";
export const automaticSyncAttemptStorageKey = "eoringo/automatic-sync-attempt-v1";
export const identityConflictRecoveryStorageKey = "eoringo/identity-conflict-recovery-v1";

const transitionMaxAgeMs = 15 * 60 * 1000;
const identityConflictRecoveryMaxAgeMs = 15 * 60 * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AuthTransition =
  | { kind: "guest-link"; userId: string; createdAt: string }
  | { kind: "account-switch"; createdAt: string };

const getSessionStorage = (): StorageLike | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getLocalStorage = (): StorageLike | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const getPendingAuthTransition = (
  storage: StorageLike | null = getSessionStorage(),
): AuthTransition | null => {
  if (!storage) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(storage.getItem(authTransitionStorageKey) ?? "null");

    if (
      typeof value !== "object" ||
      value === null ||
      !("kind" in value) ||
      !("createdAt" in value) ||
      typeof value.createdAt !== "string" ||
      !["guest-link", "account-switch"].includes(value.kind as string)
    ) {
      if (value !== null) {
        storage.removeItem(authTransitionStorageKey);
      }
      return null;
    }

    const createdAt = Date.parse(value.createdAt);

    if (!Number.isFinite(createdAt) || Date.now() - createdAt > transitionMaxAgeMs) {
      storage.removeItem(authTransitionStorageKey);
      return null;
    }

    if (value.kind === "guest-link") {
      if (!("userId" in value) || typeof value.userId !== "string" || !value.userId) {
        storage.removeItem(authTransitionStorageKey);
        return null;
      }

      return {
        kind: "guest-link",
        userId: value.userId,
        createdAt: value.createdAt,
      };
    }

    return { kind: "account-switch", createdAt: value.createdAt };
  } catch {
    storage.removeItem(authTransitionStorageKey);
    return null;
  }
};

const writeTransition = (
  transition: AuthTransition,
  storage: StorageLike | null = getSessionStorage(),
) => {
  storage?.setItem(authTransitionStorageKey, JSON.stringify(transition));
};

export const markPendingGuestLink = (
  userId: string,
  storage: StorageLike | null = getSessionStorage(),
) => {
  if (userId) {
    writeTransition(
      { kind: "guest-link", userId, createdAt: new Date().toISOString() },
      storage,
    );
  }
};

export const markPendingAccountSwitch = (storage: StorageLike | null = getSessionStorage()) => {
  writeTransition({ kind: "account-switch", createdAt: new Date().toISOString() }, storage);
};

export const isPendingGuestLink = (
  userId: string,
  storage: StorageLike | null = getSessionStorage(),
) => {
  const transition = getPendingAuthTransition(storage);
  return transition?.kind === "guest-link" && transition.userId === userId;
};

export const isPendingAccountSwitch = (storage: StorageLike | null = getSessionStorage()) =>
  getPendingAuthTransition(storage)?.kind === "account-switch";

export const clearPendingAuthTransition = () => {
  getSessionStorage()?.removeItem(authTransitionStorageKey);
};

const readIdentityConflictRecovery = (storage: StorageLike | null) => {
  if (!storage) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(
      storage.getItem(identityConflictRecoveryStorageKey) ?? "null",
    );

    if (
      typeof value !== "object" ||
      value === null ||
      !("createdAt" in value) ||
      typeof value.createdAt !== "string"
    ) {
      if (value !== null) {
        storage.removeItem(identityConflictRecoveryStorageKey);
      }
      return null;
    }

    const createdAt = Date.parse(value.createdAt);

    if (!Number.isFinite(createdAt) || Date.now() - createdAt > identityConflictRecoveryMaxAgeMs) {
      storage.removeItem(identityConflictRecoveryStorageKey);
      return null;
    }

    return { createdAt: value.createdAt };
  } catch {
    storage.removeItem(identityConflictRecoveryStorageKey);
    return null;
  }
};

export const hasIdentityConflictRecovery = (
  storage: StorageLike | null = getSessionStorage(),
) => readIdentityConflictRecovery(storage) !== null;

export const markIdentityConflictRecovery = (
  storage: StorageLike | null = getSessionStorage(),
) => {
  storage?.setItem(
    identityConflictRecoveryStorageKey,
    JSON.stringify({ createdAt: new Date().toISOString() }),
  );
};

export const clearIdentityConflictRecovery = (
  storage: StorageLike | null = getSessionStorage(),
) => {
  storage?.removeItem(identityConflictRecoveryStorageKey);
};

const readAutomaticAttempts = (storage: StorageLike | null = getLocalStorage()) => {
  if (!storage) {
    return {};
  }

  try {
    const value: unknown = JSON.parse(
      storage.getItem(automaticSyncAttemptStorageKey) ?? "{}",
    );

    return typeof value === "object" && value !== null ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
};

export const hasAutomaticSyncAttempt = (
  userId: string,
  storage: StorageLike | null = getLocalStorage(),
) => typeof readAutomaticAttempts(storage)[userId] === "string";

export const markAutomaticSyncAttempt = (
  userId: string,
  storage: StorageLike | null = getLocalStorage(),
) => {
  if (!storage || !userId) {
    return;
  }

  storage.setItem(
    automaticSyncAttemptStorageKey,
    JSON.stringify({ ...readAutomaticAttempts(storage), [userId]: new Date().toISOString() }),
  );
};

export const clearAutomaticSyncAttempt = (
  userId: string,
  storage: StorageLike | null = getLocalStorage(),
) => {
  if (!storage) {
    return;
  }

  const attempts = readAutomaticAttempts(storage);
  delete attempts[userId];
  storage.setItem(automaticSyncAttemptStorageKey, JSON.stringify(attempts));
};
