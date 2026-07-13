import { useCallback, useMemo } from "react";
import { getHomeTodayTaskGroups } from "../../domain/tasks/getHomeTodayTaskGroups";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplates } from "../../domain/tasks/getVisibleTaskTemplates";
import { orderTasksBySavedGroupOrder } from "../../domain/tasks/taskOrdering";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useTaskStore } from "../../stores/useTaskStore";
import { useTaskUiStore } from "../../stores/task/useTaskUiStore";
import type { TaskTemplate } from "../../types";

const emptyCompleted = {} as const;

export const useHomeTodayTasks = () => {
  const characterId = useCharacterStore((state) => state.activeCharacterId);
  const completed = useTaskStore(
    (state) => state.completedByCharacter[characterId] ?? emptyCompleted,
  );
  const disabledIds = useCurrentDisabledDefaultTaskIds();
  const customTasks = useCurrentCustomTaskTemplates();
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const setTaskCount = useTaskStore((state) => state.setTaskCount);
  const orderByGroup = useTaskUiStore((state) => state.orderByGroup);

  const groups = useMemo(() => {
    const tasks = getVisibleTaskTemplates(disabledIds, customTasks);
    const orderedTasks = [
      ...orderTasksBySavedGroupOrder(
        tasks.filter((task) => task.category === "daily"),
        characterId,
        "daily",
        orderByGroup,
      ),
      ...orderTasksBySavedGroupOrder(
        tasks.filter((task) => task.category === "weekly"),
        characterId,
        "weekly",
        orderByGroup,
      ),
      ...tasks
        .filter((task) => task.category === "custom")
        .sort((a, b) => a.priority - b.priority),
    ];

    return getHomeTodayTaskGroups(orderedTasks, completed);
  }, [characterId, completed, customTasks, disabledIds, orderByGroup]);

  const toggle = useCallback(
    (task: TaskTemplate) =>
      toggleTask(
        getTaskScopeId(task, characterId),
        task.id,
        task.maxCount,
        task.resetRuleId,
      ),
    [characterId, toggleTask],
  );

  const setCount = useCallback(
    (task: TaskTemplate, count: number) =>
      setTaskCount(
        getTaskScopeId(task, characterId),
        task.id,
        count,
        task.maxCount,
        task.resetRuleId,
      ),
    [characterId, setTaskCount],
  );

  return { characterId, groups, toggle, setCount };
};
