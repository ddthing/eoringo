import type { SupabaseClient } from "@supabase/supabase-js";
import { remoteSyncEnvironment } from "../lib/supabase/env";
import { useSyncStore } from "../stores/sync/useSyncStore";
import {
  createCharacterImageSync,
  createSupabaseCharacterImageSyncTransport,
} from "./characterImageSync";
import { createDocumentRepository } from "./documentRepository";
import { createMutationQueue, getMutationQueueStorageKey } from "./mutationQueue";
import { createStoreSyncBridge } from "./storeSyncBridge";
import { createSupabaseDocumentDataSource } from "./supabaseDocumentDataSource";
import { registerRemoteSyncController } from "./remoteSyncControl";
import { createSyncCoordinator } from "./syncCoordinator";
import { hasActiveSyncAccount } from "./syncConsent";

export const startRemoteSyncRuntime = async (supabase: SupabaseClient, userId: string) => {
  if (!userId) {
    throw new Error("Remote sync requires a verified user identity.");
  }

  let stopped = false;
  const repository = createDocumentRepository(
    createSupabaseDocumentDataSource(supabase),
  );
  const queue = createMutationQueue(
    localStorage,
    getMutationQueueStorageKey(userId),
    userId,
  );
  let requestSync = () => {};
  const bridge = createStoreSyncBridge({
    queue,
    ownerUserId: userId,
    canWrite: () => !stopped && hasActiveSyncAccount(userId),
    deferStart: true,
    requestSync: () => requestSync(),
  });
  const coordinator = createSyncCoordinator({
    repository,
    queue,
    hydrate: bridge.hydrate,
    setState: (patch) => useSyncStore.getState().setSyncState(patch),
  });
  const imageSync = createCharacterImageSync(
    createSupabaseCharacterImageSyncTransport(supabase),
    { uploadsEnabled: remoteSyncEnvironment.imageUploadsEnabled },
  );
  let imageInFlight: Promise<void> | null = null;
  const syncImages = () => {
    if (imageInFlight) {
      return imageInFlight;
    }

    imageInFlight = (async () => {
      try {
        const result = await imageSync.sync();

        if (result.failed.length > 0) {
          useSyncStore.getState().setSyncState({ status: "error" });
        }
      } catch {
        useSyncStore.getState().setSyncState({ status: "error" });
      }
    })().finally(() => {
      imageInFlight = null;
    });

    return imageInFlight;
  };
  const inFlight = new Set<Promise<void>>();
  const syncAll = (trigger: Parameters<typeof coordinator.sync>[0]) => {
    const operation = (async () => {
      if (stopped || !hasActiveSyncAccount(userId)) {
        return;
      }

      await coordinator.sync(trigger);

      if (stopped || !hasActiveSyncAccount(userId)) {
        return;
      }

      await syncImages();
    })();

    inFlight.add(operation);
    void operation.then(
      () => inFlight.delete(operation),
      () => inFlight.delete(operation),
    );

    return operation;
  };
  requestSync = () => void syncAll("write");
  let unregisterController: (() => void) | null = null;

  try {
    await syncAll("startup");
    bridge.start();
    unregisterController = registerRemoteSyncController({
      async pause() {
        stopped = true;
        bridge.stop();
        coordinator.stop();
        await Promise.allSettled([...inFlight]);
      },
    });
  } catch (error) {
    stopped = true;
    bridge.stop();
    coordinator.stop();
    throw error;
  }

  const handleFocus = () => {
    if (document.visibilityState === "visible") {
      void syncAll("focus");
    }
  };
  const handleOnline = () => void syncAll("online");
  window.addEventListener("focus", handleFocus);
  window.addEventListener("online", handleOnline);
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESHED") {
      void syncAll("token-refresh");
    }
  });

  return () => {
    stopped = true;
    unregisterController?.();
    data.subscription.unsubscribe();
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("online", handleOnline);
    bridge.stop();
    coordinator.stop();
  };
};
