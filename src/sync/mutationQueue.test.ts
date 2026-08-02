import { describe, expect, it } from "vitest";
import {
  createMutationQueue,
  getRetryDelayMs,
  maxMutationQueueItems,
  MutationQueueFailure,
  type SyncMutation,
} from "./mutationQueue";

const mutation: SyncMutation = {
  mutationId: "00000000-0000-4000-8000-000000000001",
  operation: "insert",
  documentId: null,
  documentType: "memo",
  characterId: null,
  payload: { memosByCharacter: { character: "memo" } },
  schemaVersion: 1,
  expectedRevision: null,
  retryCount: 0,
  createdAt: "2026-08-02T08:00:00.000Z",
  nextAttemptAt: "2026-08-02T08:00:00.000Z",
};

const makeStorage = (initial: string | null = null) => {
  let value = initial;

  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
};

describe("durable mutation queue", () => {
  it("deduplicates mutation IDs for safe replay", () => {
    const queue = createMutationQueue(makeStorage());

    queue.enqueue(mutation);
    expect(queue.enqueue(mutation)).toHaveLength(1);
  });

  it("rejects credentials and unknown envelope fields", () => {
    const queue = createMutationQueue(makeStorage());

    expect(() =>
      queue.enqueue({ ...mutation, accessToken: "secret" } as SyncMutation),
    ).toThrow(MutationQueueFailure);
  });

  it("fails closed when persisted data is corrupt", () => {
    const queue = createMutationQueue(makeStorage('{"access_token":"secret"}'));

    expect(() => queue.read()).toThrowError(
      expect.objectContaining({ code: "corrupt" }),
    );
  });

  it("enforces a hard item limit without overwriting the existing queue", () => {
    const storage = makeStorage();
    const queue = createMutationQueue(storage);

    for (let index = 0; index < maxMutationQueueItems; index += 1) {
      queue.enqueue({
        ...mutation,
        mutationId: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
      });
    }

    expect(() =>
      queue.enqueue({
        ...mutation,
        mutationId: "00000000-0000-4000-8001-000000000000",
      }),
    ).toThrowError(expect.objectContaining({ code: "full" }));
    expect(queue.read()).toHaveLength(maxMutationQueueItems);
  });

  it("uses bounded exponential backoff with deterministic jitter", () => {
    expect(getRetryDelayMs(0, 0)).toBe(750);
    expect(getRetryDelayMs(8, 1)).toBe(300_000);

    const queue = createMutationQueue(makeStorage());
    queue.enqueue(mutation);
    expect(
      queue.recordTransientFailure(
        mutation.mutationId,
        new Date("2026-08-02T08:00:00.000Z"),
        0,
      )[0],
    ).toMatchObject({
      retryCount: 1,
      nextAttemptAt: "2026-08-02T08:00:01.500Z",
    });
  });
});
