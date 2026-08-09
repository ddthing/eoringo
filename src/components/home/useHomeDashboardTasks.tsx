import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  getHomeDashboardTaskData,
  type HomeDashboardTaskData,
} from "../../domain/tasks/getHomeDashboardTaskData";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useTaskStore } from "../../stores/useTaskStore";
import { useTaskUiStore } from "../../stores/task/useTaskUiStore";
import type { TaskTemplate } from "../../types";

const emptyCompleted = {} as const;

export type HomeDashboardTasks = HomeDashboardTaskData & {
  characterId: string;
  toggle: (task: TaskTemplate) => void;
  setCount: (task: TaskTemplate, count: number) => void;
};

const HomeDashboardTasksContext = createContext<HomeDashboardTasks | null>(null);

const useHomeDashboardTaskModel = (): HomeDashboardTasks => {
  const characterId = useCharacterStore((state) => state.activeCharacterId);
  const completed = useTaskStore(
    (state) => state.completedByCharacter[characterId] ?? emptyCompleted,
  );
  const disabledIds = useCurrentDisabledDefaultTaskIds();
  const customTasks = useCurrentCustomTaskTemplates();
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const setTaskCount = useTaskStore((state) => state.setTaskCount);
  const orderByGroup = useTaskUiStore((state) => state.orderByGroup);
  const taskData = useMemo(
    () => getHomeDashboardTaskData({
      characterId,
      completedByTaskId: completed,
      disabledDefaultTaskIds: disabledIds,
      customTaskTemplates: customTasks,
      orderByGroup,
    }),
    [characterId, completed, customTasks, disabledIds, orderByGroup],
  );

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

  return useMemo(
    () => ({ characterId, ...taskData, toggle, setCount }),
    [characterId, setCount, taskData, toggle],
  );
};

export const HomeDashboardTasksProvider = ({ children }: PropsWithChildren) => {
  const value = useHomeDashboardTaskModel();

  return (
    <HomeDashboardTasksContext.Provider value={value}>
      {children}
    </HomeDashboardTasksContext.Provider>
  );
};

export const useHomeDashboardTasks = () => {
  const value = useContext(HomeDashboardTasksContext);

  if (!value) {
    throw new Error("Home dashboard task context is missing.");
  }

  return value;
};
