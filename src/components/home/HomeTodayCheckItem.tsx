import { Minus, Plus } from "lucide-react";
import { taskGroupLabels } from "../../data/tasks";
import type { HomeTodayTaskEntry } from "../../domain/tasks/getHomeTodayTaskGroups";
import { TaskCheckControl } from "../tasks/TaskCheckControl";

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
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold leading-5 text-ink">
          {task.title}
        </span>
        <span className="mt-0.5 inline-flex rounded-full bg-card-soft px-1.5 py-0.5 text-[9px] font-bold text-ink-muted">
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
    <div className="flex min-h-14 items-center gap-2 border-t border-[rgb(var(--color-line-muted))] px-1 first:border-t-0">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{identity}</div>
      <div className="flex shrink-0 items-center rounded-full border border-[rgb(var(--color-line-soft))] bg-card/90 p-0.5">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full text-ink-muted disabled:opacity-35"
          onClick={() => onSetCount(count - 1)}
          disabled={count <= 0}
          aria-label={`${task.title} 줄이기`}
        >
          <Minus aria-hidden size={14} />
        </button>
        <span className="min-w-9 text-center text-[11px] font-black tabular-nums text-ink">
          {count}/{task.maxCount}
        </span>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full text-primary disabled:opacity-35"
          onClick={() => onSetCount(count + 1)}
          disabled={count >= task.maxCount}
          aria-label={`${task.title} 늘리기`}
        >
          <Plus aria-hidden size={14} />
        </button>
      </div>
    </div>
  );
};
