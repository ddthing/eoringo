import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => {
  const bridgeStart = vi.fn();
  const bridgeStop = vi.fn();

  return {
    bridgeStart,
    bridgeStop,
    coordinatorStop: vi.fn(),
    createDocumentRepository: vi.fn(() => ({})),
    createMutationQueue: vi.fn(() => ({})),
    createStoreSyncBridge: vi.fn(() => ({
      capturePersistedChangesSince: vi.fn(),
      hydrate: vi.fn(),
      start: bridgeStart,
      stop: bridgeStop,
    })),
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
  it("starts store subscriptions before startup hydration completes", async () => {
    const unsubscribe = vi.fn();
    let resolveStartup: (() => void) | undefined;
    mocks.sync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStartup = resolve;
        }),
    );
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

    const runtime = startRemoteSyncRuntime(supabase);
    await Promise.resolve();

    expect(mocks.createStoreSyncBridge).toHaveBeenCalledOnce();
    expect(mocks.createStoreSyncBridge).toHaveBeenCalledWith(
      expect.objectContaining({ deferStart: true }),
    );
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.sync).toHaveBeenCalledWith("startup");
    expect(mocks.bridgeStart.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.sync.mock.invocationCallOrder[0]);

    resolveStartup?.();
    const stop = await runtime;

    stop();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.bridgeStart).toHaveBeenCalledOnce();
    expect(mocks.bridgeStop).toHaveBeenCalledOnce();
    expect(mocks.coordinatorStop).toHaveBeenCalledOnce();
  });

  it("cleans up without starting subscriptions when startup sync fails", async () => {
    const startupError = new Error("startup failed");
    mocks.sync.mockRejectedValue(startupError);
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
      auth: { onAuthStateChange: vi.fn() },
    } as unknown as SupabaseClient;

    await expect(startRemoteSyncRuntime(supabase)).rejects.toThrow(startupError);

    expect(mocks.bridgeStart).toHaveBeenCalledOnce();
    expect(mocks.bridgeStop).toHaveBeenCalledOnce();
    expect(mocks.coordinatorStop).toHaveBeenCalledOnce();
    expect(supabase.auth.onAuthStateChange).not.toHaveBeenCalled();
  });
});
