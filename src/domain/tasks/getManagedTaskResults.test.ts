import { describe, expect, it } from "vitest";
import type { TaskTemplate } from "../../types";
import { getManagedTaskResults } from "./getManagedTaskResults";

const createTask = (
  id: string,
  enabledByDefault: boolean,
  title = id,
): TaskTemplate => ({
  id,
  title,
  category: "daily",
  resetType: "daily",
  resetRuleId: "daily-midnight",
  maxCount: 1,
  enabledByDefault,
  characterScoped: true,
  group: "combat",
  priority: 1,
  isDefault: true,
});

describe("managed task results", () => {
  it("filters default and custom tasks once with the same visible result count", () => {
    const visibleDefault = createTask("default-visible", true, "전투 일일");
    const hiddenDefault = createTask("default-hidden", true, "전투 숨김");
    const visibleCustom = createTask("custom-visible", true, "전투 커스텀");
    const hiddenCustom = createTask("custom-hidden", false, "전투 커스텀 숨김");

    const result = getManagedTaskResults({
      defaultTasks: [visibleDefault, hiddenDefault],
      customTasks: [visibleCustom, hiddenCustom],
      disabledDefaultTaskIds: [hiddenDefault.id],
      query: "전투",
      status: "enabled",
      resetFilter: "all",
    });

    expect(result.defaultTasks).toEqual([visibleDefault]);
    expect(result.customTasks).toEqual([visibleCustom]);
    expect(result.resultCount).toBe(2);
  });
});
