import { taskGroupLabels } from "../../data/tasks";
import type { HomeTodayTaskEntry } from "../../domain/tasks/getHomeTodayTaskGroups";
import { TaskCheckControl } from "../tasks/TaskCheckControl";
import { TaskCountStepper } from "../tasks/TaskCountStepper";

type HomeTodayCheckItemProps = HomeTodayTaskEntry & {
  onToggle: () => void;
  onSetCount: (count: number) => void;
};

export const HomeTodayCheckItem = ({
  task,
  count,
  completed,
  onToggle,
  onSetCount,
}: HomeTodayCheckItemProps) => {
  const identity = (
    <>
      <TaskCheckControl checked={completed} className="h-[22px] w-[22px] rounded-full" />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-5 text-ink">
          {task.title}
        </span>
        <span className="inline-flex shrink-0 rounded-full bg-card-soft px-1.5 py-0.5 text-[9px] font-bold text-ink-muted">
          {taskGroupLabels[task.group]}
        </span>
      </span>
    </>
  );

  if (task.maxCount === 1) {
    return (
      <button
        type="button"
        className="flex min-h-12 w-full items-center gap-2.5 border-t border-[rgb(var(--color-line-muted))] px-1 text-left transition-[background-color,transform] first:border-t-0 hover:bg-card-soft/60 active:scale-[0.995]"
        onClick={onToggle}
        aria-pressed={completed}
      >
        {identity}
      </button>
    );
  }

  return (
    <div className="flex min-h-12 items-center gap-2 border-t border-[rgb(var(--color-line-muted))] px-1 first:border-t-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{identity}</div>
      <TaskCountStepper
        title={task.title}
        count={count}
        maxCount={task.maxCount}
        onChange={onSetCount}
      />
    </div>
  );
};
