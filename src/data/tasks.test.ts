import { describe, expect, it } from "vitest";
import { resetRuleRegistry } from "../domain/tasks/resetRules";
import { defaultTaskTemplates } from "./tasks";

describe("default task reset rules", () => {
  it("does not include Arka Sodara delivery for Korean servers", () => {
    expect(defaultTaskTemplates.some((task) => task.title.includes("아르카 소달리"))).toBe(false);
  });

  it("maps every default task to a registered reset rule", () => {
    expect(defaultTaskTemplates.length).toBeGreaterThan(0);
    defaultTaskTemplates.forEach((task) => {
      expect(resetRuleRegistry[task.resetRuleId], task.id).toBeDefined();
    });
  });

  it("uses detailed rules for fixed-time and interval tasks", () => {
    const byId = new Map(defaultTaskTemplates.map((task) => [task.id, task]));

    expect(byId.get("daily-grand-company-supply")?.resetRuleId).toBe("daily-0500");
    expect(byId.get("daily-island-pasture")?.resetRuleId).toBe("daily-1700");
    expect(byId.get("weekly-gold-saucer-jumbo-cactpot")?.resetRuleId).toBe(
      "weekly-sat-2100",
    );
    expect(byId.get("daily-retainer")?.resetRuleId).toBe("interval-18h");
    expect(byId.get("weekly-treasure-map")?.resetRuleId).toBe("interval-18h");
    expect(byId.get("weekly-treasure-map")).toMatchObject({
      title: "보물지도 채집",
      category: "daily",
      resetType: "eighteenHours",
      group: "event",
    });
    expect(byId.get("weekly-gold-saucer-jumbo-cactpot")).toMatchObject({
      category: "weekly",
      characterScoped: true,
      group: "lifestyle",
    });
    expect(byId.get("weekly-fashion-report")).toMatchObject({
      category: "weekly",
      characterScoped: true,
      group: "lifestyle",
    });
  });

  it("replaces combined island and squadron tasks with independent entries", () => {
    const ids = new Set(defaultTaskTemplates.map((task) => task.id));

    expect(ids.has("daily-island")).toBe(false);
    expect(ids.has("weekly-island")).toBe(false);
    expect(ids.has("grand-company-squadron-weekly")).toBe(false);
    expect(ids.has("daily-island-pasture")).toBe(true);
    expect(ids.has("weekly-island-workshop")).toBe(true);
    expect(ids.has("grand-company-squadron-routine")).toBe(true);
    expect(ids.has("grand-company-squadron-priority")).toBe(true);
  });

  it("stores fashion availability and Wondrous Tails retention metadata", () => {
    const byId = new Map(defaultTaskTemplates.map((task) => [task.id, task]));

    expect(byId.get("weekly-fashion-report")?.availabilityRuleId).toBe("weekly-fri-1700");
    expect(byId.get("weekly-wondrous-tails")?.retentionDays).toBe(14);
  });
});
