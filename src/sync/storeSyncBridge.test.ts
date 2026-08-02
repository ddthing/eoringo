import { afterEach, describe, expect, it, vi } from "vitest";
import { useWeeklyMemoStore } from "../stores/memo/useWeeklyMemoStore";
import { createStoreSyncBridge } from "./storeSyncBridge";

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
      now: () => new Date("2026-08-02T08:00:00.000Z"),
      createMutationId: () => "00000000-0000-4000-8000-000000000001",
    });

    useWeeklyMemoStore.getState().setMemo("character", "local change");
    await Promise.resolve();

    expect(queue.upsertLatest).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "insert",
        documentType: "memo",
        payload: { memosByCharacter: { character: "local change" } },
      }),
    );
    expect(queue.upsertLatest.mock.calls[0][0]).not.toHaveProperty("accessToken");
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
});
