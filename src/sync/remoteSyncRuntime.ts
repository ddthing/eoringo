import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreSyncRequest } from "./storeSyncBridge";
import { remoteSyncEnvironment } from "../lib/supabase/env";
import { useSyncStore } from "../stores/sync/useSyncStore";
import {
  createCharacterImageSync,
  createSupabaseCharacterImageSyncTransport,
} from "./characterImageSync";
import { createDocumentRepository } from "./documentRepository";
import { createMutationQueue } from "./mutationQueue";
import { createStoreSyncBridge } from "./storeSyncBridge";
import { createSupabaseDocumentDataSource } from "./supabaseDocumentDataSource";
import { createSyncCoordinator } from "./syncCoordinator";

type RemoteSyncRuntimeOptions = {
  initialLocalStorageSnapshot?: ReadonlyMap<string, string | null>;
};

export const startRemoteSyncRuntime = async (
  supabase: SupabaseClient,
  options: RemoteSyncRuntimeOptions = {},
) => {
  const repository = createDocumentRepository(
    createSupabaseDocumentDataSource(supabase),
  );
  const queue = createMutationQueue(localStorage);
  let requestSync = (_request: StoreSyncRequest) => {};
  const bridge = createStoreSyncBridge({
    queue,
    deferStart: true,
    requestSync: (request) => requestSync(request),
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
  const syncAll = async (
    trigger: Parameters<typeof coordinator.sync>[0],
    imageSyncRequired = false,
  ) => {
    try {
      await coordinator.sync(trigger);
      if (trigger !== "write" || imageSyncRequired) {
        await syncImages();
      }
    } catch {
      useSyncStore.getState().setSyncState({ status: "error" });
    }
  };
  requestSync = ({ imageSyncRequired }) => void syncAll("write", imageSyncRequired);

  options.initialLocalStorageSnapshot &&
    bridge.capturePersistedChangesSince(options.initialLocalStorageSnapshot);

  try {
    // Subscribe before the first remote read so local edits made during a
    // slow startup are queued and replayed after hydration instead of being
    // lost when the remote snapshot is applied.
    bridge.start();
    await coordinator.sync("startup");
    await syncImages();
  } catch (error) {
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
    data.subscription.unsubscribe();
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("online", handleOnline);
    bridge.stop();
    coordinator.stop();
  };
};
