import { z } from "zod";
import { documentCodecs, type DocumentType } from "./codecs";
import { getJsonByteLength } from "./codecs/common";

/**
 * Legacy queue key. It is intentionally no longer opened by the remote sync
 * runtime because entries created before account isolation have no trustworthy
 * owner identity.
 */
export const mutationQueueStorageKey = "eoringo/sync-mutations-v1";
export const userMutationQueueStorageKey = "eoringo/sync-mutations-v2";

export const getMutationQueueStorageKey = (userId: string) =>
  `${userMutationQueueStorageKey}:${encodeURIComponent(userId)}`;
export const maxMutationQueueItems = 100;
export const maxMutationQueueBytes = 2 * 1024 * 1024;
export const maxMutationRetries = 8;

export type SyncMutation = {
  mutationId: string;
  /** Defense in depth for corrupted or misrouted per-user queue entries. */
  ownerUserId?: string;
  operation: "insert" | "update";
  documentId: string | null;
  documentType: DocumentType;
  characterId: string | null;
  payload: unknown;
  schemaVersion: number;
  expectedRevision: number | null;
  retryCount: number;
  createdAt: string;
  nextAttemptAt: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const envelopeSchema = z
  .object({
    mutationId: z.uuid(),
    ownerUserId: z.uuid().optional(),
    operation: z.enum(["insert", "update"]),
    documentId: z.uuid().nullable(),
    documentType: z.enum([
      "characters",
      "tasks",
      "dday",
      "memo",
      "allowance",
      "history",
    ]),
    characterId: z.uuid().nullable(),
    payload: z.unknown(),
    schemaVersion: z.number().int().min(1).max(1000),
    expectedRevision: z.number().int().nonnegative().safe().nullable(),
    retryCount: z.number().int().min(0).max(maxMutationRetries),
    createdAt: z.iso.datetime({ offset: true }),
    nextAttemptAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((mutation, context) => {
    const isInsert = mutation.operation === "insert";

    if (isInsert !== (mutation.documentId === null && mutation.expectedRevision === null)) {
      context.addIssue({
        code: "custom",
        message: "Insert and update identities must be internally consistent.",
      });
    }
  });

export class MutationQueueFailure extends Error {
  readonly code: "corrupt" | "full" | "invalid";

  constructor(code: MutationQueueFailure["code"]) {
    super(code);
    this.name = "MutationQueueFailure";
    this.code = code;
  }
}

export const parseSyncMutation = (value: unknown): SyncMutation => {
  const envelope = envelopeSchema.safeParse(value);

  if (!envelope.success) {
    throw new MutationQueueFailure("invalid");
  }

  const codec = documentCodecs[envelope.data.documentType];

  if (envelope.data.schemaVersion !== codec.schemaVersion) {
    throw new MutationQueueFailure("invalid");
  }

  try {
    return { ...envelope.data, payload: codec.parse(envelope.data.payload) };
  } catch {
    throw new MutationQueueFailure("invalid");
  }
};

const assertQueueOwner = (mutation: SyncMutation, ownerUserId?: string) => {
  if (ownerUserId && mutation.ownerUserId !== ownerUserId) {
    throw new MutationQueueFailure("invalid");
  }

  return mutation;
};

const parseQueue = (raw: string | null, ownerUserId?: string) => {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Queue must be an array.");
    }

    const queue = parsed.map(parseSyncMutation).map((mutation) =>
      assertQueueOwner(mutation, ownerUserId),
    );

    if (queue.length > maxMutationQueueItems || getJsonByteLength(queue) > maxMutationQueueBytes) {
      throw new Error("Queue exceeds its limits.");
    }

    return queue;
  } catch (error) {
    if (error instanceof MutationQueueFailure) {
      throw error;
    }

    throw new MutationQueueFailure("corrupt");
  }
};

const persistQueue = (storage: StorageLike, key: string, queue: SyncMutation[]) => {
  if (queue.length > maxMutationQueueItems || getJsonByteLength(queue) > maxMutationQueueBytes) {
    throw new MutationQueueFailure("full");
  }

  storage.setItem(key, JSON.stringify(queue));
};

export const getRetryDelayMs = (retryCount: number, jitter = Math.random()) => {
  const boundedRetry = Math.min(Math.max(retryCount, 0), maxMutationRetries);
  const boundedJitter = Math.min(Math.max(jitter, 0), 1);
  const base = Math.min(1_000 * 2 ** boundedRetry, 300_000);

  return Math.min(Math.round(base * (0.75 + boundedJitter * 0.5)), 300_000);
};

export const createMutationQueue = (
  storage: StorageLike,
  key = mutationQueueStorageKey,
  ownerUserId?: string,
) => ({
  read(): SyncMutation[] {
    return parseQueue(storage.getItem(key), ownerUserId);
  },

  enqueue(input: SyncMutation): SyncMutation[] {
    const mutation = assertQueueOwner(parseSyncMutation(input), ownerUserId);
    const queue = parseQueue(storage.getItem(key), ownerUserId);

    if (queue.some((item) => item.mutationId === mutation.mutationId)) {
      return queue;
    }

    const next = [...queue, mutation];
    persistQueue(storage, key, next);
    return next;
  },

  upsertLatest(input: SyncMutation): SyncMutation[] {
    const mutation = assertQueueOwner(parseSyncMutation(input), ownerUserId);
    const queue = parseQueue(storage.getItem(key), ownerUserId);
    const existing = queue.find(
      (item) =>
        item.documentType === mutation.documentType &&
        item.characterId === mutation.characterId,
    );
    const replacement = existing
      ? {
          ...mutation,
          mutationId: existing.mutationId,
          operation: existing.operation,
          documentId: existing.documentId,
          expectedRevision: existing.expectedRevision,
          createdAt: existing.createdAt,
          retryCount: 0,
        }
      : mutation;
    const next = existing
      ? queue.map((item) =>
          item.mutationId === existing.mutationId
            ? assertQueueOwner(parseSyncMutation(replacement), ownerUserId)
            : item,
        )
      : [...queue, replacement];
    persistQueue(storage, key, next);
    return next;
  },

  remove(mutationId: string): SyncMutation[] {
    const queue = parseQueue(storage.getItem(key), ownerUserId);
    const next = queue.filter((mutation) => mutation.mutationId !== mutationId);
    persistQueue(storage, key, next);
    return next;
  },

  recordTransientFailure(
    mutationId: string,
    now: Date,
    jitter?: number,
  ): SyncMutation[] {
    const queue = parseQueue(storage.getItem(key), ownerUserId);
    const next = queue.map((mutation) => {
      if (mutation.mutationId !== mutationId) {
        return mutation;
      }

      const retryCount = Math.min(mutation.retryCount + 1, maxMutationRetries);
      return {
        ...mutation,
        retryCount,
        nextAttemptAt: new Date(
          now.getTime() + getRetryDelayMs(retryCount, jitter),
        ).toISOString(),
      };
    });
    persistQueue(storage, key, next);
    return next;
  },

  clear(): void {
    persistQueue(storage, key, []);
  },
});

export const clearMutationQueueForUser = (
  storage: StorageLike,
  userId: string,
) => {
  persistQueue(storage, getMutationQueueStorageKey(userId), []);
};

export const clearAllMutationQueues = (
  storage: Pick<Storage, "length" | "key" | "removeItem">,
) => {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));

  keys.forEach((key) => {
    if (
      key === mutationQueueStorageKey ||
      key?.startsWith(`${userMutationQueueStorageKey}:`)
    ) {
      storage.removeItem(key);
    }
  });
};
