import { describe, expect, it } from "vitest";
import type { TaskTemplate } from "../../types";
import {
  buildDailyIncompleteNotification,
  getDailyIncompleteTaskTitles,
  normalizeNotificationTime,
} from "./notificationSchedule";
import { planDailyIncompleteNotification } from "./notificationPlanner";

const dailyTask: TaskTemplate = {
  id: "daily-task",
  title: "무작위 임무: 숙련자",
  category: "daily",
  resetType: "daily",
  resetRuleId: "daily-midnight",
  maxCount: 1,
  enabledByDefault: true,
  characterScoped: true,
  group: "roulette",
  priority: 10,
  isDefault: true,
};

const weeklyTask: TaskTemplate = {
  ...dailyTask,
  id: "weekly-task",
  title: "주간 숙제",
  category: "weekly",
};

describe("daily incomplete notification planning", () => {
  it("normalizes invalid notification times to the safe default", () => {
    expect(normalizeNotificationTime("09:30")).toBe("09:30");
    expect(normalizeNotificationTime("25:99")).toBe("21:00");
    expect(normalizeNotificationTime(undefined)).toBe("21:00");
  });

  it("only includes incomplete daily tasks", () => {
    expect(
      getDailyIncompleteTaskTitles([dailyTask, weeklyTask], {
        "daily-task": 1,
      }),
    ).toEqual([]);

    expect(
      getDailyIncompleteTaskTitles([dailyTask, weeklyTask], {}),
    ).toEqual(["무작위 임무: 숙련자"]);
  });

  it("builds a compact notification body for multiple characters", () => {
    expect(
      buildDailyIncompleteNotification([
        { characterName: "모험가 A", taskTitles: ["무작위 임무: 숙련자"] },
        { characterName: "모험가 B", taskTitles: ["무작위 임무: 토벌전", "무작위 임무: 멘토"] },
      ]),
    ).toEqual({
      title: "오늘 미완료 숙제가 있어요",
      body: "모험가 A 1개 · 모험가 B 2개",
    });
  });

  it("delivers once at the configured KST minute", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");

    expect(
      planDailyIncompleteNotification({
        now,
        notificationTime: "21:00",
        lastDeliveryKey: null,
        summaries: [{ characterName: "모험가", taskTitles: [dailyTask.title] }],
      }),
    ).toMatchObject({
      kind: "deliver",
      deliveryKey: "2026-08-15:21:00",
      payload: {
        title: "오늘 미완료 숙제가 있어요",
        body: "모험가 1개",
      },
    });

    expect(
      planDailyIncompleteNotification({
        now,
        notificationTime: "21:00",
        lastDeliveryKey: "2026-08-15:21:00",
        summaries: [{ characterName: "모험가", taskTitles: [dailyTask.title] }],
      }).kind,
    ).toBe("skip");
  });
});
