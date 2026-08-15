import { afterEach, describe, expect, it, vi } from "vitest";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { createStoreSyncBridge } from "./storeSyncBridge";
import type { DocumentWrite } from "./documentRepository";

const originalMemo = useWeeklyMemoStore.getState().memosByCharacter;

afterEach(() => {
  useWeeklyMemoStore.setState({ memosByCharacter: originalMemo });
});

describe("store sync bridge", () => {
  it("coalesces a local store change into a credential-free mutation", async () => {
    const queue = { upsertLatest: vi.fn() };
    const requestSync = vi.fn();
    const bridge = createStoreSyncBridge({
      queue,
      requestSync,
      ownerUserId: "00000000-0000-4000-8000-000000000031",
      now: () => new Date("2026-08-02T08:00:00.000Z"),
      createMutationId: () => "00000000-0000-4000-8000-000000000001",
    });

    useWeeklyMemoStore.getState().setMemo("character", "local change");
    await Promise.resolve();

    expect(queue.upsertLatest).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: "00000000-0000-4000-8000-000000000031",
        operation: "insert",
        documentType: "memo",
        payload: { memosByCharacter: { character: "local change" } },
      }),
    );
    expect(queue.upsertLatest.mock.calls[0][0]).not.toHaveProperty("accessToken");
    expect(requestSync).toHaveBeenCalledOnce();
    bridge.stop();
  });

  it("captures only the document mapped to changed stores and keeps the latest same-tick value", async () => {
    const queue = { upsertLatest: vi.fn() };
    const requestSync = vi.fn();
    const captureDocument = vi.fn((documentType: "characters" | "memo" | "dday" | "allowance" | "tasks" | "history") => {
      if (documentType !== "memo") {
        throw new Error(`Unexpected capture: ${documentType}`);
      }

      return {
        documentType: "memo",
        characterId: null,
        payload: { memosByCharacter: useWeeklyMemoStore.getState().memosByCharacter },
        schemaVersion: 1,
      } satisfies DocumentWrite;
    });
    const bridge = createStoreSyncBridge({
      queue,
      requestSync,
      captureDocument,
    });

    useWeeklyMemoStore.getState().setMemo("character", "first");
    useWeeklyMemoStore.getState().setMemo("character", "latest");
    await Promise.resolve();

    expect(captureDocument).toHaveBeenCalledTimes(1);
    expect(captureDocument).toHaveBeenCalledWith("memo");
    expect(queue.upsertLatest).toHaveBeenCalledTimes(1);
    expect(queue.upsertLatest).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { memosByCharacter: { character: "latest" } } }),
    );
    expect(requestSync).toHaveBeenCalledOnce();
    bridge.stop();
  });

  it("does not enqueue remote hydration as a new local write", async () => {
    const queue = { upsertLatest: vi.fn() };
    const bridge = createStoreSyncBridge({ queue, requestSync: vi.fn() });

    bridge.hydrate([
      {
        id: "00000000-0000-4000-8000-000000000010",
        documentType: "memo",
        characterId: null,
        payload: { memosByCharacter: { character: "remote" } },
        schemaVersion: 1,
        revision: 3,
        updatedAt: "2026-08-02T08:00:00.000Z",
      },
    ]);
    await Promise.resolve();

    expect(queue.upsertLatest).not.toHaveBeenCalled();
    bridge.stop();
  });

  it("drops local changes after the active account is revoked", async () => {
    const queue = { upsertLatest: vi.fn() };
    const requestSync = vi.fn();
    let canWrite = true;
    const bridge = createStoreSyncBridge({
      queue,
      requestSync,
      canWrite: () => canWrite,
    });

    canWrite = false;
    useWeeklyMemoStore.getState().setMemo("character", "must stay local");
    await Promise.resolve();

    expect(queue.upsertLatest).not.toHaveBeenCalled();
    expect(requestSync).not.toHaveBeenCalled();
    bridge.stop();
  });

  it("defers local change subscriptions until explicitly started", async () => {
    const queue = { upsertLatest: vi.fn() };
    const requestSync = vi.fn();
    const bridge = createStoreSyncBridge({
      queue,
      requestSync,
      deferStart: true,
    });

    useWeeklyMemoStore.getState().setMemo("character", "before start");
    await Promise.resolve();

    expect(queue.upsertLatest).not.toHaveBeenCalled();
    expect(requestSync).not.toHaveBeenCalled();

    bridge.start();
    useWeeklyMemoStore.getState().setMemo("character", "after start");
    await Promise.resolve();

    expect(queue.upsertLatest).toHaveBeenCalledOnce();
    expect(requestSync).toHaveBeenCalledOnce();
    bridge.stop();
  });
});
