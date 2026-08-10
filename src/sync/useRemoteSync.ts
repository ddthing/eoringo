import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { getSupabaseClient } from "../lib/supabase/client";
import { useSyncStore } from "../stores/sync/useSyncStore";
import { isPendingAccountSwitch } from "../auth/authTransitionStorage";
import {
  hasActiveSyncAccount,
  hasSyncConsent,
  syncConsentEvent,
} from "./syncConsent";

export const useRemoteSync = () => {
  const auth = useAuth();
  const [consentVersion, setConsentVersion] = useState(0);
  const [hydrationReady, setHydrationReady] = useState(true);

  useEffect(() => {
    const handleConsent = () => setConsentVersion((version) => version + 1);
    window.addEventListener(syncConsentEvent, handleConsent);

    return () => window.removeEventListener(syncConsentEvent, handleConsent);
  }, []);

  useEffect(() => {
    const accountBootstrapPending = isPendingAccountSwitch();
    const userId = auth.userId;

    if (
      auth.mode !== "permanent" ||
      !userId ||
      !hasSyncConsent(userId) ||
      !hasActiveSyncAccount(userId) ||
      accountBootstrapPending
    ) {
      useSyncStore.getState().reset();
      setHydrationReady(auth.mode !== "permanent" || !userId);
      return undefined;
    }

    let active = true;
    let cleanup = () => {};
    setHydrationReady(false);

    void (async () => {
      try {
        const [supabase, runtime] = await Promise.all([
          getSupabaseClient(),
          import("./remoteSyncRuntime"),
        ]);

        if (!supabase || !active) {
          throw new Error("Remote sync unavailable.");
        }

        const stopRuntime = await runtime.startRemoteSyncRuntime(supabase, userId);

        if (!active) {
          stopRuntime();
          return;
        }
        cleanup = stopRuntime;
      } catch {
        if (active) {
          useSyncStore.getState().setSyncState({ status: "error" });
        }
      } finally {
        if (active) {
          setHydrationReady(true);
        }
      }
    })();

    return () => {
      active = false;
      cleanup();
    };
  }, [auth.mode, auth.userId, consentVersion]);

  return hydrationReady;
};
