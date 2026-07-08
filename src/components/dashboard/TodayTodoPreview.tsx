import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { getTaskCount, getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useTaskStore } from "../../stores/useTaskStore";

const PREVIEW_LIMIT = 5;

export const TodayTodoPreview = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const disabledDefaultTaskIds = useTaskStore((state) => state.disabledDefaultTaskIds);
  const customTaskTemplates = useTaskStore((state) => state.customTaskTemplates);
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
  const progress = useMemo(() => getTaskProgress(tasks, completed), [completed, tasks]);
  const remainingTasks = useMemo(
    () =>
      tasks
        .filter((task) => getTaskCount(completed[task.id]) < task.maxCount)
        .slice(0, PREVIEW_LIMIT),
    [completed, tasks],
  );

  return (
    <section className="rounded-[16px] border border-[rgb(var(--color-line-soft))] bg-card/95 p-3 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-ink">숙제 진행도</h2>
          <p className="mt-0.5 text-xs font-medium text-ink-muted">남은 주요 항목</p>
        </div>
        <span className="sticker">
          {progress.completed}/{progress.total} 완료
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-line-muted))]">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="mt-3 space-y-1.5">
        {remainingTasks.length > 0 ? (
          remainingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 rounded-[10px] border border-[rgb(var(--color-line-muted))] bg-card-soft/60 px-2.5 py-1.5"
            >
              <span className="h-1 w-1 shrink-0 rounded-full bg-primary" />
              <p className="min-w-0 truncate text-sm font-bold text-ink">{task.title}</p>
              {task.maxCount > 1 ? (
                <span className="ml-auto shrink-0 text-[11px] font-bold text-ink-muted">
                  {getTaskCount(completed[task.id])}/{task.maxCount}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-[12px] bg-mint/70 px-3 py-3 text-sm font-bold text-ink">
            오늘 체크는 모두 끝났어요.
          </p>
        )}
      </div>

      <Link
        to="/tasks"
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[rgb(var(--color-line-muted))] bg-card-soft/72 px-3 text-xs font-black text-primary"
      >
        전체 숙제 보기
        <ArrowRight aria-hidden size={14} />
      </Link>
    </section>
  );
};
