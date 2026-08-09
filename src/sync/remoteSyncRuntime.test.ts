import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => {
  const bridgeStop = vi.fn();

  return {
    bridgeStop,
    coordinatorStop: vi.fn(),
    createDocumentRepository: vi.fn(() => ({})),
    createMutationQueue: vi.fn(() => ({})),
    createStoreSyncBridge: vi.fn(() => ({ hydrate: vi.fn(), stop: bridgeStop })),
    createSupabaseDocumentDataSource: vi.fn(() => ({})),
    createSyncCoordinator: vi.fn(),
    sync: vi.fn(),
  };
});

vi.mock("./documentRepository", () => ({
  createDocumentRepository: mocks.createDocumentRepository,
}));
vi.mock("./mutationQueue", () => ({
  createMutationQueue: mocks.createMutationQueue,
}));
vi.mock("./storeSyncBridge", () => ({
  createStoreSyncBridge: mocks.createStoreSyncBridge,
}));
vi.mock("./supabaseDocumentDataSource", () => ({
  createSupabaseDocumentDataSource: mocks.createSupabaseDocumentDataSource,
}));
vi.mock("./syncCoordinator", () => ({
  createSyncCoordinator: mocks.createSyncCoordinator,
}));

import { startRemoteSyncRuntime } from "./remoteSyncRuntime";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("remote sync runtime", () => {
  it("hydrates before and after attaching the store bridge during startup", async () => {
    const unsubscribe = vi.fn();
    mocks.sync.mockResolvedValue(undefined);
    mocks.createSyncCoordinator.mockReturnValue({
      sync: mocks.sync,
      stop: mocks.coordinatorStop,
    });
    vi.stubGlobal("localStorage", {});
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const supabase = {
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      },
    } as unknown as SupabaseClient;

    const stop = await startRemoteSyncRuntime(supabase);

    expect(mocks.sync).toHaveBeenNthCalledWith(1, "startup");
    expect(mocks.createStoreSyncBridge).toHaveBeenCalledOnce();
    expect(mocks.sync).toHaveBeenNthCalledWith(2, "startup");
    expect(mocks.sync.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.createStoreSyncBridge.mock.invocationCallOrder[0]);
    expect(mocks.createStoreSyncBridge.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sync.mock.invocationCallOrder[1]);

    stop();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.bridgeStop).toHaveBeenCalledOnce();
    expect(mocks.coordinatorStop).toHaveBeenCalledOnce();
  });
});
