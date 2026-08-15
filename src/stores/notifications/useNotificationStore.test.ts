import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_TIME,
  normalizeNotificationState,
  useNotificationStore,
} from "./useNotificationStore";

describe("notification preferences", () => {
  beforeEach(() => {
    useNotificationStore.setState({
      dailyIncompleteEnabled: false,
      backgroundPushEnabled: false,
      dailyIncompleteTime: DEFAULT_NOTIFICATION_TIME,
      lastDailyIncompleteNotificationKey: null,
    });
  });

  it("normalizes invalid persisted preferences", () => {
    expect(
      normalizeNotificationState({
        dailyIncompleteEnabled: true,
        dailyIncompleteTime: "99:99",
        lastDailyIncompleteNotificationKey: 42,
      }),
    ).toEqual({
      dailyIncompleteEnabled: true,
      backgroundPushEnabled: false,
      dailyIncompleteTime: DEFAULT_NOTIFICATION_TIME,
      lastDailyIncompleteNotificationKey: null,
    });
  });

  it("stores the selected reminder time and delivery key", () => {
    useNotificationStore.getState().setDailyIncompleteTime("08:30");
    useNotificationStore.getState().setBackgroundPushEnabled(true);
    useNotificationStore.getState().markDailyIncompleteNotification("2026-08-15:08:30");

    expect(useNotificationStore.getState()).toMatchObject({
      backgroundPushEnabled: true,
      dailyIncompleteTime: "08:30",
      lastDailyIncompleteNotificationKey: "2026-08-15:08:30",
    });
  });
});
