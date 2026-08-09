import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncStore } from "../stores/sync/useSyncStore";
import { createDocumentRepository } from "./documentRepository";
import { createMutationQueue } from "./mutationQueue";
import { createStoreSyncBridge } from "./storeSyncBridge";
import { createSupabaseDocumentDataSource } from "./supabaseDocumentDataSource";
import { createSyncCoordinator } from "./syncCoordinator";

export const startRemoteSyncRuntime = async (supabase: SupabaseClient) => {
  const repository = createDocumentRepository(
    createSupabaseDocumentDataSource(supabase),
  );
  const queue = createMutationQueue(localStorage);
  let requestSync = () => {};
  const bridge = createStoreSyncBridge({
    queue,
    deferStart: true,
    requestSync: () => requestSync(),
  });
  const coordinator = createSyncCoordinator({
    repository,
    queue,
    hydrate: bridge.hydrate,
    setState: (patch) => useSyncStore.getState().setSyncState(patch),
  });
  requestSync = () => void coordinator.sync("write");

  try {
    await coordinator.sync("startup");
    bridge.start();
  } catch (error) {
    bridge.stop();
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
    bridge.stop();
    coordinator.stop();
  };
};
