import type { TaskGroup, TaskTemplate } from "../../types";

export type TaskOrderView = "daily" | "weekly";
export type TaskOrderByGroup = Record<string, string[]>;

export const taskGroupOrder: TaskGroup[] = [
  "roulette",
  "delivery",
  "combat",
  "pvp",
  "housing",
  "lifestyle",
  "event",
  "custom",
];

export const getTaskOrderScopeKey = (
  characterId: string,
  view: TaskOrderView,
  group: TaskGroup,
) => `${characterId}:${view}:${group}`;

export const sortTasksBySavedOrder = (
  tasks: TaskTemplate[],
  savedOrder: string[],
) => {
  const taskIds = new Set(tasks.map((task) => task.id));
  const savedIndexById = new Map<string, number>();

  savedOrder.forEach((taskId) => {
    if (taskIds.has(taskId) && !savedIndexById.has(taskId)) {
      savedIndexById.set(taskId, savedIndexById.size);
    }
  });

  return [...tasks].sort((a, b) => {
    const aIndex = savedIndexById.get(a.id);
    const bIndex = savedIndexById.get(b.id);
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return a.priority - b.priority;
  });
};

export const orderTasksBySavedGroupOrder = (
  tasks: TaskTemplate[],
  characterId: string,
  view: TaskOrderView,
  orderByGroup: TaskOrderByGroup,
) => taskGroupOrder.flatMap((group) => {
  const groupTasks = tasks.filter((task) => task.group === group);
  const scopeKey = getTaskOrderScopeKey(characterId, view, group);
  return sortTasksBySavedOrder(groupTasks, orderByGroup[scopeKey] ?? []);
});
