import { describe, expect, it } from "vitest";
import {
  buildPushNotificationPayload,
  isValidTimezone,
  normalizePushSubscription,
  normalizePushSummary,
} from "./pushNotification";

const subscription = {
  endpoint: "https://push.example.test/send/abc",
  expirationTime: null,
  keys: {
    p256dh: "BabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-",
    auth: "auth-value_31",
  },
};

const summary = {
  summaryDate: "2026-08-15",
  characters: [
    {
      characterName: "모험가",
      taskTitles: [],
      dailyTaskTitles: ["숙련자", "전장"],
      summaryDate: "2026-08-15",
    },
  ],
};

describe("push notification boundary validation", () => {
  it("strips no fields and accepts a browser subscription", () => {
    expect(normalizePushSubscription(subscription)).toEqual(subscription);
  });

  it("rejects extra subscription fields", () => {
    expect(normalizePushSubscription({ ...subscription, extra: true })).toBeNull();
  });

  it("uses all daily tasks after the saved summary date changes", () => {
    expect(buildPushNotificationPayload(summary, "2026-08-16")).toEqual({
      title: "오늘 미완료 숙제가 있어요",
      body: "모험가 2개",
      url: "/tasks",
    });
  });

  it("does not send when the current pending list is empty", () => {
    expect(
      buildPushNotificationPayload(
        { ...summary, characters: [{ ...summary.characters[0], summaryDate: "2026-08-15" }] },
        "2026-08-15",
      ),
    ).toBeNull();
  });

  it("rejects unsafe summary text and invalid dates", () => {
    expect(
      normalizePushSummary({
        ...summary,
        summaryDate: "2026-02-30",
      }),
    ).toBeNull();
    expect(
      normalizePushSummary({
        ...summary,
        characters: [{ ...summary.characters[0], characterName: "bad\nname" }],
      }),
    ).toBeNull();
  });

  it("accepts real IANA zones and rejects lookalikes", () => {
    expect(isValidTimezone("Asia/Seoul")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});
