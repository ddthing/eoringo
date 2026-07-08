import { useMemo } from "react";
import { getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useTaskStore } from "../../stores/useTaskStore";

export const TaskOverview = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const activeCharacter = useCharacterStore((state) =>
    state.characters.find((character) => character.id === state.activeCharacterId),
  );
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const disabledDefaultTaskIds = useTaskStore((state) => state.disabledDefaultTaskIds);
  const customTaskTemplates = useTaskStore((state) => state.customTaskTemplates);
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
    <section className="grid grid-cols-3 gap-2">
      <div className="memo-card bg-card/82 p-2.5">
        <p className="muted-label">현재</p>
        <p className="mt-1 truncate text-sm font-bold">{activeCharacter?.name ?? "나의 모험가"}</p>
        <p className="truncate text-[11px] text-ink-muted">{activeCharacter?.server ?? "톤베리"}</p>
      </div>
      <div className="memo-card bg-card/82 p-2.5">
        <p className="muted-label">오늘</p>
        <p className="mt-1 text-lg font-bold text-primary">{dailyProgress.percent}%</p>
        <p className="text-[11px] text-ink-muted">
          {dailyProgress.completed}/{dailyProgress.total}
        </p>
      </div>
      <div className="memo-card bg-card/82 p-2.5">
        <p className="muted-label">이번 주</p>
        <p className="mt-1 text-lg font-bold text-primary">{weeklyProgress.percent}%</p>
        <p className="text-[11px] text-ink-muted">
          {weeklyProgress.completed}/{weeklyProgress.total}
        </p>
      </div>
    </section>
  );
};
