import { describe, expect, it } from "vitest";
import { defaultTaskTemplates } from "./tasks";

describe("default task templates", () => {
  it("does not include Arka Sodara delivery for Korean servers", () => {
    expect(defaultTaskTemplates.some((task) => task.title.includes("아르카 소달리"))).toBe(false);
  });

  it("uses an 18 hour reset for treasure map gathering", () => {
    expect(defaultTaskTemplates.find((task) => task.id === "weekly-treasure-map")).toMatchObject({
      title: "보물지도 채집",
      category: "daily",
      resetType: "eighteenHours",
      group: "event",
    });
  });

  it("includes weekly Gold Saucer tasks in lifestyle group", () => {
    expect(
      defaultTaskTemplates.find((task) => task.id === "weekly-gold-saucer-jumbo-cactpot"),
    ).toMatchObject({
      title: "골드소서 주간 복권",
      category: "weekly",
      resetType: "weekly",
      characterScoped: true,
      group: "lifestyle",
    });
    expect(defaultTaskTemplates.find((task) => task.id === "weekly-fashion-report")).toMatchObject(
      {
        title: "패션 체크",
        category: "weekly",
        resetType: "weekly",
        characterScoped: true,
        group: "lifestyle",
      },
    );
  });
});
