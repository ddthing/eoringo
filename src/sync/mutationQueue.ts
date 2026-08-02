import { z } from "zod";
import { documentCodecs, type DocumentType } from "./codecs";
import { getJsonByteLength } from "./codecs/common";

export const mutationQueueStorageKey = "eoringo/sync-mutations-v1";
export const maxMutationQueueItems = 100;
export const maxMutationQueueBytes = 2 * 1024 * 1024;
export const maxMutationRetries = 8;

export type SyncMutation = {
  mutationId: string;
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

const parseQueue = (raw: string | null) => {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Queue must be an array.");
    }

    const queue = parsed.map(parseSyncMutation);

    if (queue.length > maxMutationQueueItems || getJsonByteLength(queue) > maxMutationQueueBytes) {
      throw new Error("Queue exceeds its limits.");
    }

    return queue;
  } catch {
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
) => ({
  read(): SyncMutation[] {
    return parseQueue(storage.getItem(key));
  },

  enqueue(input: SyncMutation): SyncMutation[] {
    const mutation = parseSyncMutation(input);
    const queue = parseQueue(storage.getItem(key));

    if (queue.some((item) => item.mutationId === mutation.mutationId)) {
      return queue;
    }

    const next = [...queue, mutation];
    persistQueue(storage, key, next);
    return next;
  },

  remove(mutationId: string): SyncMutation[] {
    const queue = parseQueue(storage.getItem(key));
    const next = queue.filter((mutation) => mutation.mutationId !== mutationId);
    persistQueue(storage, key, next);
    return next;
  },

  recordTransientFailure(
    mutationId: string,
    now: Date,
    jitter?: number,
  ): SyncMutation[] {
    const queue = parseQueue(storage.getItem(key));
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
});
