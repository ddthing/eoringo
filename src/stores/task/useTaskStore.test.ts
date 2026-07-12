import { describe, expect, it } from "vitest";
import { getCurrentFixedResetKeys } from "../../domain/tasks/resetRules";
import { normalizePersistedTaskState, useTaskStore } from "../useTaskStore";

describe("task store phase 1 migration", () => {
  it("moves legacy custom tasks and global progress to one character scope", () => {
    const state = normalizePersistedTaskState({
      customTaskTemplates: [{ id: "custom-1", title: "메모", maxCount: 1 }],
      completedByCharacter: { global: { "custom-1": true } },
      disabledGlobalDefaultTaskIds: ["daily-expert"],
    });

    expect(state.customTaskTemplatesByCharacter?.["default-character"]).toHaveLength(1);
    expect(state.completedByCharacter?.["default-character"]?.["custom-1"]).toBe(1);
    expect(state.completedByCharacter?.global).toBeUndefined();
    expect(state.disabledDefaultTaskIdsByCharacter?.["default-character"]).toContain("daily-expert");
  });

  it("keeps character scoped data independent", () => {
    const state = normalizePersistedTaskState({
      completedByCharacter: { a: { task: 1 }, b: {} },
      customTaskTemplatesByCharacter: {
        a: [{ id: "a-task", title: "A 숙제" }],
        b: [{ id: "b-task", title: "B 숙제" }],
      },
    });

    expect(state.customTaskTemplatesByCharacter?.a?.[0].id).toBe("a-task");
    expect(state.customTaskTemplatesByCharacter?.b?.[0].id).toBe("b-task");
    expect(state.completedByCharacter?.b?.task).toBeUndefined();
  });
});

describe("task store v6 migration", () => {
  it("splits legacy island and squadron values without losing completion", () => {
    const migrationDate = new Date("2026-07-12T00:00:00.000Z");
    const state = normalizePersistedTaskState(
      {
        completedByCharacter: {
          a: {
            "daily-island": 1,
            "weekly-island": 1,
            "grand-company-squadron-weekly": 1,
          },
        },
        disabledDefaultTaskIdsByCharacter: {
          a: ["daily-island", "grand-company-squadron-weekly"],
        },
      },
      5,
      migrationDate,
    );

    expect(state.completedByCharacter?.a).toMatchObject({
      "daily-island-pasture": 1,
      "weekly-island-workshop": 1,
      "grand-company-squadron-routine": 1,
      "grand-company-squadron-priority": 1,
    });
    expect(state.completedByCharacter?.a?.["daily-island"]).toBeUndefined();
    expect(state.completedAtByCharacter?.a?.["grand-company-squadron-routine"]).toBe(
      migrationDate.toISOString(),
    );
    expect(state.disabledDefaultTaskIdsByCharacter?.a).toEqual(
      expect.arrayContaining([
        "daily-island-pasture",
        "weekly-island-workshop",
        "grand-company-squadron-routine",
        "grand-company-squadron-priority",
      ]),
    );
  });

  it("initializes current rule keys during migration to avoid an immediate mass reset", () => {
    const migrationDate = new Date("2026-07-14T08:00:00.000Z");
    const state = normalizePersistedTaskState({ completedByCharacter: { a: { task: 1 } } }, 5, migrationDate);

    expect(state.resetKeysByRule).toEqual(getCurrentFixedResetKeys(migrationDate));
    expect(state.completedByCharacter?.a?.task).toBe(1);
  });

  it("clears only tasks whose fixed reset rule crossed its boundary", () => {
    const before = new Date("2026-07-11T19:59:59.000Z");
    const after = new Date("2026-07-11T20:00:00.000Z");
    useTaskStore.setState({
      completedByCharacter: {
        a: { "daily-grand-company-supply": 1, "daily-expert": 1 },
      },
      completedAtByCharacter: {},
      customTaskTemplatesByCharacter: {},
      resetKeysByRule: getCurrentFixedResetKeys(before),
    });

    useTaskStore.getState().ensureCurrentResets(after);

    expect(useTaskStore.getState().completedByCharacter.a?.["daily-grand-company-supply"]).toBeUndefined();
    expect(useTaskStore.getState().completedByCharacter.a?.["daily-expert"]).toBe(1);
  });

  it("expires interval tasks independently for each character", () => {
    const now = new Date("2026-07-12T12:00:00.000Z");
    useTaskStore.setState({
      completedByCharacter: {
        a: { "daily-retainer": 1 },
        b: { "daily-retainer": 1 },
      },
      completedAtByCharacter: {
        a: { "daily-retainer": "2026-07-11T17:59:59.000Z" },
        b: { "daily-retainer": "2026-07-11T18:00:01.000Z" },
      },
      customTaskTemplatesByCharacter: {},
      resetKeysByRule: getCurrentFixedResetKeys(now),
    });

    useTaskStore.getState().ensureCurrentResets(now);

    expect(useTaskStore.getState().completedByCharacter.a?.["daily-retainer"]).toBeUndefined();
    expect(useTaskStore.getState().completedByCharacter.b?.["daily-retainer"]).toBe(1);
  });
});
