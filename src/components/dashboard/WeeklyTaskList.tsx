import { useMemo } from "react";
import { getTaskCount, getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import { getKstWeekKey } from "../../lib/date";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useTaskStore } from "../../stores/useTaskStore";
import { TaskItem } from "../tasks/TaskItem";

export const WeeklyTaskList = () => {
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
        "weekly",
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
  const progress = useMemo(() => getTaskProgress(tasks, completed), [completed, tasks]);

  return (
    <section className="memo-card overflow-hidden bg-card/82">
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-line-soft))] px-3 py-2">
        <div>
          <p className="muted-label">주간</p>
          <h2 className="text-sm font-bold">이번 주 메모</h2>
          <p className="text-[11px] text-ink-muted">주간 기준 {getKstWeekKey()} 화요일</p>
        </div>
        <span className="sticker">
          {progress.completed}/{progress.total}
        </span>
      </div>
      <div>
        {tasks.map((task) => {
          const scopeId = getTaskScopeId(task, activeCharacterId);

          return (
            <TaskItem
              key={task.id}
              task={task}
              count={getTaskCount(completed[task.id])}
              onToggle={() => toggleTask(scopeId, task.id, task.maxCount, task.resetType)}
              onSetCount={(count) =>
                setTaskCount(scopeId, task.id, count, task.maxCount, task.resetType)
              }
            />
          );
        })}
      </div>
    </section>
  );
};
