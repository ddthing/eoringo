import { taskGroupLabels } from "../../data/tasks";
import type { HomeTodayTaskEntry } from "../../domain/tasks/getHomeTodayTaskGroups";
import { TaskCheckControl } from "../tasks/TaskCheckControl";
import { TaskCountStepper } from "../tasks/TaskCountStepper";

type HomeTodayCheckItemProps = HomeTodayTaskEntry & {
  onToggle: () => void;
  onSetCount: (count: number) => void;
  completionFeedback?: boolean;
  disabled?: boolean;
};

export const HomeTodayCheckItem = ({
  task,
  count,
  completed,
  onToggle,
  onSetCount,
  completionFeedback = false,
  disabled = false,
}: HomeTodayCheckItemProps) => {
  const identity = (
    <>
      <TaskCheckControl checked={completed} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-5 text-ink">
          {task.title}
        </span>
        {completionFeedback ? (
          <span
            className="inline-flex shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[9px] font-black text-primary"
            role="status"
            aria-live="polite"
          >
            완료
          </span>
        ) : (
          <span className="inline-flex shrink-0 rounded-full bg-card-soft px-1.5 py-0.5 text-[9px] font-bold text-ink-muted">
            {taskGroupLabels[task.group]}
          </span>
        )}
      </span>
    </>
  );

  if (task.maxCount === 1) {
    return (
      <button
        type="button"
        className={[
          "flex min-h-12 w-full items-center gap-2.5 overflow-hidden border-t border-[rgb(var(--color-line-muted))] px-1 text-left first:border-t-0",
          completionFeedback
            ? "home-task-completion-row bg-mint/55"
            : "transition-[background-color,transform] hover:bg-card-soft/60 active:scale-[0.995]",
        ].join(" ")}
        onClick={onToggle}
        aria-pressed={completed}
        disabled={disabled}
      >
        {identity}
      </button>
    );
  }

  return (
    <div
      className={[
        "flex min-h-12 items-center gap-2 overflow-hidden border-t border-[rgb(var(--color-line-muted))] px-1 first:border-t-0",
        completionFeedback ? "home-task-completion-row bg-mint/55" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{identity}</div>
      <TaskCountStepper
        title={task.title}
        count={count}
        maxCount={task.maxCount}
        onChange={onSetCount}
        disabled={disabled}
      />
    </div>
  );
};
