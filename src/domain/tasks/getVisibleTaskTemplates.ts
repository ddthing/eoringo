import { defaultTaskTemplates } from "../../data/tasks";
import type { TaskCategory, TaskTemplate } from "../../types";

export const getVisibleDefaultTaskTemplates = (disabledDefaultTaskIds: string[]) => {
  const disabledSet = new Set(disabledDefaultTaskIds);

  return defaultTaskTemplates.filter(
    (task) => task.enabledByDefault && !disabledSet.has(task.id),
  );
};

export const getVisibleTaskTemplates = (
  disabledDefaultTaskIds: string[],
  customTaskTemplates: TaskTemplate[],
) =>
  [...getVisibleDefaultTaskTemplates(disabledDefaultTaskIds), ...customTaskTemplates.filter((task) => task.enabledByDefault)]
    .sort((a, b) => a.priority - b.priority);

export const getVisibleTaskTemplatesByCategory = (
  disabledDefaultTaskIds: string[],
  customTaskTemplates: TaskTemplate[],
  category: TaskCategory,
) =>
  getVisibleTaskTemplates(disabledDefaultTaskIds, customTaskTemplates).filter(
    (task) => task.category === category,
  );
