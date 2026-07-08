import { useMemo } from "react";
import { getTaskCount, getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useTaskStore } from "../../stores/useTaskStore";
import { TaskItem } from "../tasks/TaskItem";

type DailyTaskListProps = {
  limit?: number;
};

export const DailyTaskList = ({ limit }: DailyTaskListProps) => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const disabledDefaultTaskIds = useTaskStore((state) => state.disabledDefaultTaskIds);
  const customTaskTemplates = useTaskStore((state) => state.customTaskTemplates);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const setTaskCount = useTaskStore((state) => state.setTaskCount);
  const tasks = useMemo(
    () =>
      getVisibleTaskTemplatesByCategory(
        disabledDefaultTaskIds,
        customTaskTemplates,
        "daily",
      ),
    [customTaskTemplates, disabledDefaultTaskIds],
  );
  const completed = useMemo(
    () =>
      Object.fromEntries(
        tasks.map((task) => [
          task.id,
          completedByCharacter[getTaskScopeId(task, activeCharacterId)]?.[task.id],
        ]),
      ),
    [activeCharacterId, completedByCharacter, tasks],
  );
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aDone = getTaskCount(completed[a.id]) >= a.maxCount;
        const bDone = getTaskCount(completed[b.id]) >= b.maxCount;

        if (aDone === bDone) {
          return a.priority - b.priority;
        }

        return aDone ? 1 : -1;
      }),
    [completed, tasks],
  );
  const displayedTasks = limit ? sortedTasks.slice(0, limit) : sortedTasks;
  const progress = useMemo(() => getTaskProgress(tasks, completed), [completed, tasks]);

  return (
    <section className="memo-card overflow-hidden bg-card/82">
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-line-soft))] px-3 py-2">
        <div>
          <p className="muted-label">할 일</p>
          <h2 className="text-sm font-bold">오늘의 체크 메모</h2>
        </div>
        <span className="sticker">
          {progress.completed}/{progress.total}
        </span>
      </div>
      <div>
        {displayedTasks.map((task) => {
          const scopeId = getTaskScopeId(task, activeCharacterId);

          return (
            <TaskItem
              key={task.id}
              task={task}
              count={getTaskCount(completed[task.id])}
              onToggle={() => toggleTask(scopeId, task.id, task.maxCount)}
              onSetCount={(count) => setTaskCount(scopeId, task.id, count, task.maxCount)}
            />
          );
        })}
      </div>
      {limit && tasks.length > limit ? (
        <p className="px-3 py-2 text-center text-xs font-medium text-ink-muted">
          전체 {tasks.length}개 중 {limit}개 표시
        </p>
      ) : null}
    </section>
  );
};
