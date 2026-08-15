import { useEffect, useRef } from "react";
import { useAuth } from "../../auth/useAuth";
import { getKstDateKey } from "../../lib/date";
import { upsertRemotePushSubscription } from "../../domain/notifications/remotePushSubscription";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { useCharacterStore } from "../../stores/character/useCharacterStore";
import { useNotificationStore } from "../../stores/notifications/useNotificationStore";
import { useTaskStore } from "../../stores/task/useTaskStore";
import { createBackgroundPushSyncController } from "./backgroundPushSync";
import { syncBackgroundPushSubscription } from "./backgroundPushRuntimeSync";

export const BackgroundPushRuntime = () => {
  const auth = useAuth();
  const now = useMinuteNow();
  const summaryDate = getKstDateKey(now);
  const backgroundPushEnabled = useNotificationStore(
    (state) => state.backgroundPushEnabled,
  );
  const dailyIncompleteTime = useNotificationStore((state) => state.dailyIncompleteTime);
  const characters = useCharacterStore((state) => state.characters);
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const customTaskTemplatesByCharacter = useTaskStore(
    (state) => state.customTaskTemplatesByCharacter,
  );
  const disabledDefaultTaskIdsByCharacter = useTaskStore(
    (state) => state.disabledDefaultTaskIdsByCharacter,
  );
  const latestAuthRef = useRef(auth);
  const mountedRef = useRef(true);
  const latestSyncRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const syncControllerRef = useRef<
    ReturnType<typeof createBackgroundPushSyncController> | null
  >(null);

  if (syncControllerRef.current === null) {
    syncControllerRef.current = createBackgroundPushSyncController({
      sync: () => latestSyncRef.current(),
    });
  }

  const syncController = syncControllerRef.current;

  const syncLatest = async () => {
    await syncBackgroundPushSubscription({
      getAuth: () => latestAuthRef.current,
      getNotificationState: () => useNotificationStore.getState(),
      getCharacters: () => useCharacterStore.getState().characters,
      getTaskSource: () => useTaskStore.getState(),
      isMounted: () => mountedRef.current,
      setBackgroundPushEnabled: (enabled) =>
        useNotificationStore.getState().setBackgroundPushEnabled(enabled),
      upsert: upsertRemotePushSubscription,
    });
  };

  useEffect(() => {
    latestAuthRef.current = auth;
  }, [auth]);

  useEffect(() => {
    latestSyncRef.current = syncLatest;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      syncController.cancel();
    };
  }, [syncController]);

  useEffect(() => {
    if (!backgroundPushEnabled || auth.mode !== "permanent" || !auth.userId) {
      syncController.cancel();
      return;
    }

    syncController.schedule();
  }, [
    auth.mode,
    auth.userId,
    backgroundPushEnabled,
    characters,
    completedByCharacter,
    customTaskTemplatesByCharacter,
    dailyIncompleteTime,
    disabledDefaultTaskIdsByCharacter,
    summaryDate,
    syncController,
  ]);

  return null;
};
