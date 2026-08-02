import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncStore } from "../stores/sync/useSyncStore";
import { createDocumentRepository } from "./documentRepository";
import { createMutationQueue } from "./mutationQueue";
import { hydrateStoreDocuments } from "./storeSyncAdapter";
import { createStoreSyncBridge } from "./storeSyncBridge";
import { createSupabaseDocumentDataSource } from "./supabaseDocumentDataSource";
import { createSyncCoordinator } from "./syncCoordinator";

export const startRemoteSyncRuntime = async (supabase: SupabaseClient) => {
  const repository = createDocumentRepository(
    createSupabaseDocumentDataSource(supabase),
  );
  const queue = createMutationQueue(localStorage);
  let bridge: ReturnType<typeof createStoreSyncBridge> | null = null;
  const coordinator = createSyncCoordinator({
    repository,
    queue,
    hydrate: (documents) =>
      bridge ? bridge.hydrate(documents) : hydrateStoreDocuments(documents),
    setState: (patch) => useSyncStore.getState().setSyncState(patch),
  });

  try {
    await coordinator.sync("startup");
    bridge = createStoreSyncBridge({
      queue,
      requestSync: () => void coordinator.sync("write"),
    });
    await coordinator.sync("startup");
  } catch (error) {
    bridge?.stop();
    coordinator.stop();
    throw error;
  }

  const handleFocus = () => {
    if (document.visibilityState === "visible") {
      void coordinator.sync("focus");
    }
  };
  const handleOnline = () => void coordinator.sync("online");
  window.addEventListener("focus", handleFocus);
  window.addEventListener("online", handleOnline);
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESHED") {
      void coordinator.sync("token-refresh");
    }
  });

  return () => {
    data.subscription.unsubscribe();
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("online", handleOnline);
    bridge?.stop();
    coordinator.stop();
  };
};
