import { useEffect } from "react";
import { planDailyIncompleteNotification } from "../../domain/notifications/notificationPlanner";
import {
  showBrowserNotification,
} from "../../domain/notifications/browserNotification";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { useCharacterStore } from "../../stores/character/useCharacterStore";
import { useNotificationStore } from "../../stores/notifications/useNotificationStore";
import { useTaskStore } from "../../stores/task/useTaskStore";
import { getNotificationTaskSummaries } from "./notificationSummary";

export { getNotificationTaskSummaries } from "./notificationSummary";

export const NotificationRuntime = () => {
  const now = useMinuteNow();
  const dailyIncompleteEnabled = useNotificationStore(
    (state) => state.dailyIncompleteEnabled,
  );
  const backgroundPushEnabled = useNotificationStore((state) => state.backgroundPushEnabled);
  const dailyIncompleteTime = useNotificationStore((state) => state.dailyIncompleteTime);
  const lastDailyIncompleteNotificationKey = useNotificationStore(
    (state) => state.lastDailyIncompleteNotificationKey,
  );
  const markDailyIncompleteNotification = useNotificationStore(
    (state) => state.markDailyIncompleteNotification,
  );

  useEffect(() => {
    if (!dailyIncompleteEnabled || backgroundPushEnabled) {
      return;
    }

    const taskState = useTaskStore.getState();
    const plan = planDailyIncompleteNotification({
      now,
      notificationTime: dailyIncompleteTime,
      lastDeliveryKey: lastDailyIncompleteNotificationKey,
      summaries: getNotificationTaskSummaries(useCharacterStore.getState().characters, taskState),
    });

    if (plan.kind === "deliver" && showBrowserNotification(plan.payload)) {
      markDailyIncompleteNotification(plan.deliveryKey);
    }
  }, [
    dailyIncompleteEnabled,
    backgroundPushEnabled,
    dailyIncompleteTime,
    lastDailyIncompleteNotificationKey,
    markDailyIncompleteNotification,
    now,
  ]);

  return null;
};
