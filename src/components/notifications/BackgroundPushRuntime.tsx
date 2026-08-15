import { useEffect } from "react";
import { useAuth } from "../../auth/useAuth";
import { getKstDateKey, KST_TIME_ZONE } from "../../lib/date";
import { getExistingPushSubscription, serializePushSubscription } from "../../domain/notifications/pushSubscription";
import { getBackgroundNotificationTaskSummaries } from "./notificationSummary";
import { upsertRemotePushSubscription } from "../../domain/notifications/remotePushSubscription";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { useCharacterStore } from "../../stores/character/useCharacterStore";
import { useNotificationStore } from "../../stores/notifications/useNotificationStore";
import { useTaskStore } from "../../stores/task/useTaskStore";

export const BackgroundPushRuntime = () => {
  const auth = useAuth();
  const now = useMinuteNow();
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
  const setBackgroundPushEnabled = useNotificationStore(
    (state) => state.setBackgroundPushEnabled,
  );

  useEffect(() => {
    if (!backgroundPushEnabled || auth.mode !== "permanent" || !auth.userId) {
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const subscription = await getExistingPushSubscription();

          if (!active) {
            return;
          }

          if (!subscription) {
            setBackgroundPushEnabled(false);
            return;
          }

          const serializedSubscription = serializePushSubscription(subscription);

          if (!serializedSubscription) {
            setBackgroundPushEnabled(false);
            return;
          }

          await upsertRemotePushSubscription({
            subscription: serializedSubscription,
            timezone: KST_TIME_ZONE,
            notificationTime: dailyIncompleteTime,
            summary: {
              summaryDate: getKstDateKey(now),
              characters: getBackgroundNotificationTaskSummaries(
                characters,
                {
                  completedByCharacter,
                  customTaskTemplatesByCharacter,
                  disabledDefaultTaskIdsByCharacter,
                },
                now,
              ),
            },
          });
        } catch {
          // Settings owns the initial setup error. Runtime updates are best effort.
        }
      })();
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    auth.mode,
    auth.userId,
    backgroundPushEnabled,
    characters,
    completedByCharacter,
    customTaskTemplatesByCharacter,
    dailyIncompleteTime,
    disabledDefaultTaskIdsByCharacter,
    now,
    setBackgroundPushEnabled,
  ]);

  return null;
};
