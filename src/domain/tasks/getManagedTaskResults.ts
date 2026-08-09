import { matchesManagedTask, type ResetFilter } from "./taskResetPresentation";
import type { TaskTemplate } from "../../types";

export type ManagedTaskStatus = "enabled" | "hidden" | "all";

type ManagedTaskResultsInput = {
  defaultTasks: TaskTemplate[];
  customTasks: TaskTemplate[];
  disabledDefaultTaskIds: string[];
  query: string;
  status: ManagedTaskStatus;
  resetFilter: ResetFilter;
};

export const getManagedTaskResults = ({
  defaultTasks,
  customTasks,
  disabledDefaultTaskIds,
  query,
  status,
  resetFilter,
}: ManagedTaskResultsInput) => {
  const disabledTaskIds = new Set(disabledDefaultTaskIds);
  const matchesStatus = (enabled: boolean) =>
    status === "all" || (status === "enabled" ? enabled : !enabled);
  const matchingDefaultTasks: TaskTemplate[] = [];
  const matchingCustomTasks: TaskTemplate[] = [];

  defaultTasks.forEach((task) => {
    if (
      matchesManagedTask(task, query, resetFilter)
      && matchesStatus(!disabledTaskIds.has(task.id))
    ) {
      matchingDefaultTasks.push(task);
    }
  });

  customTasks.forEach((task) => {
    if (
      matchesManagedTask(task, query, resetFilter)
      && matchesStatus(task.enabledByDefault)
    ) {
      matchingCustomTasks.push(task);
    }
  });

  return {
    defaultTasks: matchingDefaultTasks,
    customTasks: matchingCustomTasks,
    resultCount: matchingDefaultTasks.length + matchingCustomTasks.length,
  };
};
