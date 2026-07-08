import type { TaskProgress, TaskTemplate } from "../../types";

export const getTaskCount = (value: boolean | number | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  return value === true ? 1 : 0;
};

export const getTaskProgress = (
  tasks: TaskTemplate[],
  completedByTaskId: Record<string, boolean | number> = {},
): TaskProgress => {
  const total = tasks.length;
  const completed = tasks.filter(
    (task) => getTaskCount(completedByTaskId[task.id]) >= task.maxCount,
  ).length;

  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
};
