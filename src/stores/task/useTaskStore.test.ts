import { describe, expect, it } from "vitest";
import { normalizePersistedTaskState } from "../useTaskStore";

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
