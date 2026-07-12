import { useMemo } from "react";
import { getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useTaskStore } from "../../stores/useTaskStore";

export const TaskOverview = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const disabledDefaultTaskIds = useCurrentDisabledDefaultTaskIds();
  const customTaskTemplates = useCurrentCustomTaskTemplates();
  const dailyTasks = useMemo(
    () =>
      getVisibleTaskTemplatesByCategory(
        disabledDefaultTaskIds,
        customTaskTemplates,
        "daily",
      ),
    [customTaskTemplates, disabledDefaultTaskIds],
  );
  const weeklyTasks = useMemo(
    () =>
      getVisibleTaskTemplatesByCategory(
        disabledDefaultTaskIds,
        customTaskTemplates,
        "weekly",
      ),
    [customTaskTemplates, disabledDefaultTaskIds],
  );
  const dailyProgress = useMemo(() => {
    const completed = Object.fromEntries(
      dailyTasks.map((task) => [
        task.id,
        completedByCharacter[getTaskScopeId(task, activeCharacterId)]?.[task.id],
      ]),
    );

    return getTaskProgress(dailyTasks, completed);
  }, [activeCharacterId, completedByCharacter, dailyTasks]);
  const weeklyProgress = useMemo(() => {
    const completed = Object.fromEntries(
      weeklyTasks.map((task) => [
        task.id,
        completedByCharacter[getTaskScopeId(task, activeCharacterId)]?.[task.id],
      ]),
    );

    return getTaskProgress(weeklyTasks, completed);
  }, [activeCharacterId, completedByCharacter, weeklyTasks]);

  return (
    <section className="grid grid-cols-2 gap-2" aria-label="숙제 진행도 요약">
      <div className="memo-card bg-card/82 p-3">
        <p className="muted-label">오늘</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-primary">{dailyProgress.percent}%</p>
        <p className="text-xs tabular-nums text-ink-muted">
          {dailyProgress.completed}/{dailyProgress.total}
        </p>
      </div>
      <div className="memo-card bg-card/82 p-3">
        <p className="muted-label">이번 주</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-primary">{weeklyProgress.percent}%</p>
        <p className="text-xs tabular-nums text-ink-muted">
          {weeklyProgress.completed}/{weeklyProgress.total}
        </p>
      </div>
    </section>
  );
};
