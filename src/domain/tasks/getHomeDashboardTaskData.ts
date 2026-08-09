import { getHomeTodayTaskGroups, type HomeTodayTaskGroup } from "./getHomeTodayTaskGroups";
import { getTaskProgress } from "./getTaskProgress";
import { getVisibleTaskTemplates } from "./getVisibleTaskTemplates";
import { orderTasksBySavedGroupOrder, type TaskOrderByGroup } from "./taskOrdering";
import type { TaskProgress, TaskTemplate } from "../../types";

export type HomeDashboardTaskProgress = {
  daily: TaskProgress;
  weekly: TaskProgress;
  other: TaskProgress;
  total: TaskProgress;
};

export type HomeDashboardTaskData = {
  groups: HomeTodayTaskGroup[];
  progress: HomeDashboardTaskProgress;
};

type HomeDashboardTaskDataInput = {
  characterId: string;
  completedByTaskId: Record<string, boolean | number>;
  disabledDefaultTaskIds: string[];
  customTaskTemplates: TaskTemplate[];
  orderByGroup: TaskOrderByGroup;
};

export const getHomeDashboardTaskData = ({
  characterId,
  completedByTaskId,
  disabledDefaultTaskIds,
  customTaskTemplates,
  orderByGroup,
}: HomeDashboardTaskDataInput): HomeDashboardTaskData => {
  const visibleTasks = getVisibleTaskTemplates(disabledDefaultTaskIds, customTaskTemplates);
  const dailyTasks = visibleTasks.filter((task) => task.category === "daily");
  const weeklyTasks = visibleTasks.filter((task) => task.category === "weekly");
  const otherTasks = visibleTasks
    .filter((task) => task.category === "custom")
    .sort((left, right) => left.priority - right.priority);
  const orderedTasks = [
    ...orderTasksBySavedGroupOrder(dailyTasks, characterId, "daily", orderByGroup),
    ...orderTasksBySavedGroupOrder(weeklyTasks, characterId, "weekly", orderByGroup),
    ...otherTasks,
  ];

  return {
    groups: getHomeTodayTaskGroups(orderedTasks, completedByTaskId),
    progress: {
      total: getTaskProgress(visibleTasks, completedByTaskId),
      daily: getTaskProgress(dailyTasks, completedByTaskId),
      weekly: getTaskProgress(weeklyTasks, completedByTaskId),
      other: getTaskProgress(otherTasks, completedByTaskId),
    },
  };
};
