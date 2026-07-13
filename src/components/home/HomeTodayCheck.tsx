import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import type { TaskCategory } from "../../types";
import {
  completionFeedbackDurationMs,
  shouldStartTaskCompletion,
} from "./homeTaskCompletion";
import { HomeTodayCheckItem } from "./HomeTodayCheckItem";
import { useHomeTodayTasks } from "./useHomeTodayTasks";

const displayedTaskLimit = 2;

type CompletingTask = {
  category: TaskCategory;
  taskId: string;
};

export const HomeTodayCheck = () => {
  const { characterId, groups, toggle, setCount } = useHomeTodayTasks();
  const [expansion, setExpansion] = useState<{
    characterId: string;
    categories: Partial<Record<TaskCategory, boolean>>;
  }>(() => ({ characterId, categories: {} }));
  const [completing, setCompleting] = useState<{
    characterId: string;
    tasks: CompletingTask[];
  }>(() => ({ characterId, tasks: [] }));
  const completionTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const completed = groups.reduce((sum, group) => sum + group.completed, 0);
  const currentCompletingTasks = completing.characterId === characterId ? completing.tasks : [];

  useEffect(() => {
    const timers = completionTimers.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [characterId]);

  const startCompletion = (
    category: TaskCategory,
    taskId: string,
    commitCompletion: () => void,
  ) => {
    const timerKey = `${characterId}:${taskId}`;
    if (completionTimers.current.has(timerKey)) return;

    setCompleting((current) => ({
      characterId,
      tasks: [
        ...(current.characterId === characterId ? current.tasks : []),
        { category, taskId },
      ],
    }));
    commitCompletion();

    const timer = setTimeout(() => {
      completionTimers.current.delete(timerKey);
      setCompleting((current) => current.characterId !== characterId
        ? current
        : {
            ...current,
            tasks: current.tasks.filter((task) => task.taskId !== taskId),
          });
    }, completionFeedbackDurationMs);

    completionTimers.current.set(timerKey, timer);
  };

  return (
    <section className="home-panel p-4 min-[420px]:p-[18px] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="muted-label">action</p>
          <h2 className="home-heading mt-1 text-base font-black tracking-[-0.02em] text-ink">
            오늘 체크
          </h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">지금 할 일을 바로 체크하세요.</p>
        </div>
        <span className="sticker tabular-nums">{completed}/{total}</span>
      </div>

      <div className="mt-4 grid gap-2.5">
        {groups.map((group) => {
          const isExpanded = expansion.characterId === characterId
            && expansion.categories[group.category] === true;
          const completingTasks = currentCompletingTasks.filter(
            (task) => task.category === group.category,
          );
          const completingTaskIds = new Set(completingTasks.map((task) => task.taskId));
          const visiblePendingTasks = isExpanded
            ? group.pendingTasks
            : group.pendingTasks.slice(
                0,
                Math.max(0, displayedTaskLimit - completingTaskIds.size),
              );
          const visiblePendingTaskIds = new Set(
            visiblePendingTasks.map((entry) => entry.task.id),
          );
          const visibleTasks = group.allTasks.filter(
            (entry) => completingTaskIds.has(entry.task.id)
              || visiblePendingTaskIds.has(entry.task.id),
          );
          const hiddenPendingCount = group.pendingTasks.length - visiblePendingTasks.length;
          const showExpansion = group.pendingTasks.length + completingTaskIds.size
            > displayedTaskLimit;
          const hasCompletingTasks = completingTaskIds.size > 0;

          return (
          <section
            key={group.category}
            className="rounded-[16px] border border-[rgb(var(--color-line-muted))] bg-card-soft/42 px-3 py-2.5"
            aria-labelledby={`home-today-${group.category}`}
          >
            <div className="flex min-h-8 items-center justify-between gap-3">
              <h3 id={`home-today-${group.category}`} className="text-[13px] font-black text-ink">
                {group.label}
              </h3>
              <span className="text-[11px] font-bold tabular-nums text-ink-muted">
                {group.completed}/{group.total}
              </span>
            </div>

            {group.state === "empty" ? (
              <p className="py-2 text-xs font-semibold text-ink-muted">표시할 숙제가 없습니다.</p>
            ) : group.state === "complete" && !hasCompletingTasks ? (
              <p className="flex min-h-12 items-center gap-2 text-xs font-bold text-primary">
                <CheckCircle2 aria-hidden size={16} /> 오늘 항목 완료
              </p>
            ) : (
              <>
                <div>
                  {visibleTasks.map((entry) => {
                    const isCompleting = completingTaskIds.has(entry.task.id);

                    return (
                      <HomeTodayCheckItem
                        key={entry.task.id}
                        {...entry}
                        count={isCompleting ? entry.task.maxCount : entry.count}
                        completed={isCompleting || entry.completed}
                        completionFeedback={isCompleting}
                        disabled={isCompleting}
                        onToggle={() => {
                          if (isCompleting) return;
                          startCompletion(
                            group.category,
                            entry.task.id,
                            () => toggle(entry.task),
                          );
                        }}
                        onSetCount={(count) => {
                          if (isCompleting) return;
                          if (shouldStartTaskCompletion(
                            entry.count,
                            count,
                            entry.task.maxCount,
                          )) {
                            startCompletion(
                              group.category,
                              entry.task.id,
                              () => setCount(entry.task, count),
                            );
                            return;
                          }
                          setCount(entry.task, count);
                        }}
                      />
                    );
                  })}
                </div>
                {showExpansion ? (
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-[rgb(var(--color-line-muted))] pt-1 text-[11px] font-black text-primary transition hover:bg-card-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    aria-expanded={isExpanded}
                    onClick={() => setExpansion((current) => ({
                      characterId,
                      categories: {
                        ...(current.characterId === characterId ? current.categories : {}),
                        [group.category]: !isExpanded,
                      },
                    }))}
                  >
                    {isExpanded ? "접기" : `미완료 ${hiddenPendingCount}개 모두 펼치기`}
                    <ChevronDown
                      aria-hidden
                      size={14}
                      className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : null}
              </>
            )}
          </section>
          );
        })}
      </div>

      <Link to="/tasks" className="secondary-button home-touch-target mt-3 w-full gap-1.5">
        전체 숙제 보기 <ArrowRight aria-hidden size={14} />
      </Link>
    </section>
  );
};
