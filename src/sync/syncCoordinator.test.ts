import { describe, expect, it, vi } from "vitest";
import type { RemoteDocument } from "./documentRepository";
import { RemoteDataFailure } from "./supabaseDocumentDataSource";
import { createSyncCoordinator } from "./syncCoordinator";
import type { SyncMutation } from "./mutationQueue";

const mutation: SyncMutation = {
  mutationId: "00000000-0000-4000-8000-000000000001",
  operation: "update",
  documentId: "00000000-0000-4000-8000-000000000002",
  documentType: "memo",
  characterId: null,
  payload: { memosByCharacter: { character: "memo" } },
  schemaVersion: 1,
  expectedRevision: 0,
  retryCount: 0,
  createdAt: "2026-08-02T08:00:00.000Z",
  nextAttemptAt: "2026-08-02T08:00:00.000Z",
};

const document: RemoteDocument = {
  id: mutation.documentId!,
  documentType: "memo",
  characterId: null,
  payload: mutation.payload,
  schemaVersion: 1,
  revision: 1,
  updatedAt: "2026-08-02T08:00:01.000Z",
};

const makeQueue = (items: SyncMutation[] = [mutation]) => {
  let queue = items;

  return {
    read: vi.fn(() => queue),
    remove: vi.fn((mutationId: string) => {
      queue = queue.filter((item) => item.mutationId !== mutationId);
      return queue;
    }),
    recordTransientFailure: vi.fn(() => queue),
  };
};

const makeRepository = () => ({
  list: vi.fn().mockResolvedValue([document]),
  find: vi.fn().mockResolvedValue(document),
  insert: vi.fn().mockResolvedValue(document),
  update: vi.fn().mockResolvedValue({ ok: true, document }),
});

describe("sync coordinator", () => {
  it("keeps mutations queued while offline", async () => {
    const queue = makeQueue();
    const repository = makeRepository();
    const setState = vi.fn();
    const coordinator = createSyncCoordinator({
      repository,
      queue,
      hydrate: vi.fn(),
      setState,
      isOnline: () => false,
    });

    await coordinator.sync("startup");

    expect(repository.update).not.toHaveBeenCalled();
    expect(queue.remove).not.toHaveBeenCalled();
    expect(setState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "offline", pendingCount: 1 }),
    );
  });

  it("flushes in order, removes confirmed writes, then hydrates", async () => {
    const queue = makeQueue();
    const repository = makeRepository();
    const hydrate = vi.fn();
    const setState = vi.fn();
    const coordinator = createSyncCoordinator({
      repository,
      queue,
      hydrate,
      setState,
      isOnline: () => true,
      now: () => new Date("2026-08-02T08:00:02.000Z"),
    });

    await coordinator.sync("write");

    expect(repository.update).toHaveBeenCalledBefore(repository.list);
    expect(queue.remove).toHaveBeenCalledWith(mutation.mutationId);
    expect(hydrate).toHaveBeenCalledWith([document]);
    expect(setState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "saved", pendingCount: 0 }),
    );
  });

  it("does not retry or discard stale revision conflicts", async () => {
    const queue = makeQueue();
    const repository = makeRepository();
    repository.update.mockResolvedValue({ ok: false, kind: "conflict", current: document });
    const setState = vi.fn();
    const coordinator = createSyncCoordinator({
      repository,
      queue,
      hydrate: vi.fn(),
      setState,
      isOnline: () => true,
      now: () => new Date("2026-08-02T08:00:02.000Z"),
    });

    await coordinator.sync();

    expect(queue.remove).not.toHaveBeenCalled();
    expect(queue.recordTransientFailure).not.toHaveBeenCalled();
    expect(repository.list).not.toHaveBeenCalled();
    expect(setState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "conflict", conflictDocumentType: "memo" }),
    );
  });

  it("backs off transient failures without exposing or dropping the mutation", async () => {
    const queue = makeQueue();
    const repository = makeRepository();
    repository.update.mockRejectedValue(new RemoteDataFailure("network"));
    const setState = vi.fn();
    const coordinator = createSyncCoordinator({
      repository,
      queue,
      hydrate: vi.fn(),
      setState,
      isOnline: () => true,
      now: () => new Date("2026-08-02T08:00:02.000Z"),
    });

    await coordinator.sync();

    expect(queue.recordTransientFailure).toHaveBeenCalledWith(
      mutation.mutationId,
      new Date("2026-08-02T08:00:02.000Z"),
    );
    expect(queue.remove).not.toHaveBeenCalled();
    expect(setState).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("treats a replayed insert with identical server data as confirmed", async () => {
    const insertMutation = {
      ...mutation,
      operation: "insert" as const,
      documentId: null,
      expectedRevision: null,
    };
    const queue = makeQueue([insertMutation]);
    const repository = makeRepository();
    repository.insert.mockRejectedValue(new RemoteDataFailure("conflict"));
    repository.find.mockResolvedValue({ ...document, revision: 4 });
    const coordinator = createSyncCoordinator({
      repository,
      queue,
      hydrate: vi.fn(),
      setState: vi.fn(),
      isOnline: () => true,
      now: () => new Date("2026-08-02T08:00:02.000Z"),
    });

    await coordinator.sync();

    expect(queue.remove).toHaveBeenCalledWith(insertMutation.mutationId);
    expect(repository.list).toHaveBeenCalled();
  });
});
