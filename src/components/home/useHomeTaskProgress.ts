import { useMemo } from "react";
import { getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useTaskStore } from "../../stores/useTaskStore";
import type { TaskCategory, TaskTemplate } from "../../types";

const emptyCompleted = {} as const;

const getProgress = (
  tasks: TaskTemplate[],
  completed: Record<string, number | boolean>,
) => getTaskProgress(tasks, completed);

export const useHomeTaskProgress = () => {
  const characterId = useCharacterStore((state) => state.activeCharacterId);
  const completed = useTaskStore(
    (state) => state.completedByCharacter[characterId] ?? emptyCompleted,
  );
  const disabledIds = useCurrentDisabledDefaultTaskIds();
  const customTasks = useCurrentCustomTaskTemplates();

  return useMemo(() => {
    const byCategory = (category: TaskCategory) =>
      getVisibleTaskTemplatesByCategory(disabledIds, customTasks, category);
    const dailyTasks = byCategory("daily");
    const weeklyTasks = byCategory("weekly");
    const otherTasks = byCategory("custom");
    const allTasks = [...dailyTasks, ...weeklyTasks, ...otherTasks];

    return {
      total: getProgress(allTasks, completed),
      daily: getProgress(dailyTasks, completed),
      weekly: getProgress(weeklyTasks, completed),
      other: getProgress(otherTasks, completed),
    };
  }, [completed, customTasks, disabledIds]);
};
