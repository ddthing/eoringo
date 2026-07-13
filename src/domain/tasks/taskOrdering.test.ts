import { describe, expect, it } from "vitest";
import type { TaskGroup, TaskTemplate } from "../../types";
import {
  getTaskOrderScopeKey,
  orderTasksBySavedGroupOrder,
  sortTasksBySavedOrder,
} from "./taskOrdering";

const createTask = (id: string, group: TaskGroup, priority: number): TaskTemplate => ({
  id,
  title: id,
  category: "daily",
  resetType: "daily",
  resetRuleId: "daily-midnight",
  maxCount: 1,
  enabledByDefault: true,
  characterScoped: true,
  group,
  priority,
  isDefault: true,
});

describe("task ordering", () => {
  it("uses saved order before appending new tasks by priority", () => {
    const tasks = [
      createTask("new-late", "combat", 40),
      createTask("saved-first", "combat", 10),
      createTask("new-early", "combat", 20),
      createTask("saved-second", "combat", 30),
    ];

    expect(sortTasksBySavedOrder(tasks, ["saved-second", "saved-first"]).map((task) => task.id))
      .toEqual(["saved-second", "saved-first", "new-early", "new-late"]);
  });

  it("ignores stale and duplicate ids while keeping the first saved position", () => {
    const tasks = [createTask("a", "combat", 1), createTask("b", "combat", 2)];

    expect(sortTasksBySavedOrder(tasks, ["missing", "b", "b", "a"]).map((task) => task.id))
      .toEqual(["b", "a"]);
  });

  it("applies character and period scoped order across fixed group order", () => {
    const tasks = [
      createTask("combat-a", "combat", 1),
      createTask("delivery-a", "delivery", 2),
      createTask("combat-b", "combat", 3),
    ];
    const orderByGroup = {
      [getTaskOrderScopeKey("character-a", "daily", "combat")]: ["combat-b", "combat-a"],
      [getTaskOrderScopeKey("character-b", "daily", "combat")]: ["combat-a", "combat-b"],
      [getTaskOrderScopeKey("character-a", "weekly", "combat")]: ["combat-a", "combat-b"],
    };

    expect(orderTasksBySavedGroupOrder(tasks, "character-a", "daily", orderByGroup).map((task) => task.id))
      .toEqual(["delivery-a", "combat-b", "combat-a"]);
  });
});
