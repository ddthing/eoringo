import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_NOTIFICATION_TIME as DEFAULT_DAILY_INCOMPLETE_NOTIFICATION_TIME,
  normalizeNotificationTime,
} from "../../domain/notifications/notificationSchedule";
import { storageKeys } from "../../lib/storage";

export const DEFAULT_NOTIFICATION_TIME = DEFAULT_DAILY_INCOMPLETE_NOTIFICATION_TIME;

type PersistedNotificationState = {
  dailyIncompleteEnabled: boolean;
  backgroundPushEnabled: boolean;
  dailyIncompleteTime: string;
  lastDailyIncompleteNotificationKey: string | null;
};

export type NotificationState = PersistedNotificationState & {
  setDailyIncompleteEnabled: (enabled: boolean) => void;
  setBackgroundPushEnabled: (enabled: boolean) => void;
  setDailyIncompleteTime: (time: string) => void;
  markDailyIncompleteNotification: (deliveryKey: string) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeNotificationState = (persistedState: unknown): PersistedNotificationState => {
  const state = isRecord(persistedState) ? persistedState : {};

  return {
    dailyIncompleteEnabled: state.dailyIncompleteEnabled === true,
    backgroundPushEnabled: state.backgroundPushEnabled === true,
    dailyIncompleteTime: normalizeNotificationTime(state.dailyIncompleteTime),
    lastDailyIncompleteNotificationKey:
      typeof state.lastDailyIncompleteNotificationKey === "string"
        ? state.lastDailyIncompleteNotificationKey
        : null,
  };
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      dailyIncompleteEnabled: false,
      backgroundPushEnabled: false,
      dailyIncompleteTime: DEFAULT_NOTIFICATION_TIME,
      lastDailyIncompleteNotificationKey: null,
      setDailyIncompleteEnabled: (dailyIncompleteEnabled) => set({ dailyIncompleteEnabled }),
      setBackgroundPushEnabled: (backgroundPushEnabled) => set({ backgroundPushEnabled }),
      setDailyIncompleteTime: (dailyIncompleteTime) =>
        set({ dailyIncompleteTime: normalizeNotificationTime(dailyIncompleteTime) }),
      markDailyIncompleteNotification: (lastDailyIncompleteNotificationKey) =>
        set({ lastDailyIncompleteNotificationKey }),
    }),
    {
      name: storageKeys.notifications,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: normalizeNotificationState,
      partialize: (state) => ({
        dailyIncompleteEnabled: state.dailyIncompleteEnabled,
        backgroundPushEnabled: state.backgroundPushEnabled,
        dailyIncompleteTime: state.dailyIncompleteTime,
        lastDailyIncompleteNotificationKey: state.lastDailyIncompleteNotificationKey,
      }),
    },
  ),
);
