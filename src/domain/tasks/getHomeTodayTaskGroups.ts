import { getTaskCount } from "./getTaskProgress";
import type { TaskCategory, TaskTemplate } from "../../types";

export const homeTodayTaskCategories = ["daily", "weekly", "custom"] as const;

export const homeTodayTaskCategoryLabels: Record<TaskCategory, string> = {
  daily: "일일",
  weekly: "주간",
  custom: "기타",
};

export type HomeTodayTaskEntry = {
  task: TaskTemplate;
  count: number;
  completed: boolean;
};

export type HomeTodayTaskGroup = {
  category: TaskCategory;
  label: string;
  total: number;
  completed: number;
  allTasks: HomeTodayTaskEntry[];
  pendingTasks: HomeTodayTaskEntry[];
  displayedTasks: HomeTodayTaskEntry[];
  remainingCount: number;
  state: "empty" | "complete" | "pending";
};

export const getHomeTodayTaskGroups = (
  tasks: TaskTemplate[],
  completedByTaskId: Record<string, boolean | number | undefined>,
  limit = 2,
): HomeTodayTaskGroup[] =>
  homeTodayTaskCategories.map((category) => {
    const categoryTasks = tasks
      .filter((task) => task.category === category)
      .map((task) => {
        const count = getTaskCount(completedByTaskId[task.id]);

        return {
          task,
          count,
          completed: count >= task.maxCount,
        };
      });
    const pendingTasks = categoryTasks.filter((entry) => !entry.completed);
    const displayedTasks = pendingTasks.slice(0, Math.max(0, limit));
    const completed = categoryTasks.length - pendingTasks.length;

    return {
      category,
      label: homeTodayTaskCategoryLabels[category],
      total: categoryTasks.length,
      completed,
      allTasks: categoryTasks,
      pendingTasks,
      displayedTasks,
      remainingCount: Math.max(0, pendingTasks.length - displayedTasks.length),
      state:
        categoryTasks.length === 0
          ? "empty"
          : pendingTasks.length === 0
            ? "complete"
            : "pending",
    };
  });
