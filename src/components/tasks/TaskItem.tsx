import { Minus, Plus } from "lucide-react";
import { taskGroupLabels } from "../../data/tasks";
import type { TaskTemplate } from "../../types";
import type { ReactNode } from "react";
import { TaskCheckControl } from "./TaskCheckControl";

type TaskItemProps = {
  task: TaskTemplate;
  count: number;
  onToggle: () => void;
  onSetCount: (count: number) => void;
  onRemove?: () => void;
  showMeta?: boolean;
  showGroup?: boolean;
  dragHandle?: ReactNode;
  disabled?: boolean;
};

const resetLabels: Record<TaskTemplate["resetType"], string> = {
  daily: "일일",
  weekly: "주간",
  eighteenHours: "18시간",
  manual: "수동",
};

export const TaskItem = ({
  task,
  count,
  onToggle,
  onSetCount,
  onRemove,
  showMeta = false,
  showGroup = true,
  dragHandle,
  disabled = false,
}: TaskItemProps) => {
  const cappedCount = Math.min(count, task.maxCount);
  const checked = cappedCount >= task.maxCount;

  return (
    <div
      className={[
        "task-row-enter flex min-h-12 items-center gap-2 border-b border-[rgb(var(--color-line-muted))] px-2.5 py-2 transition duration-200 last:border-b-0 hover:bg-card-soft/70",
        checked ? "bg-card-soft/35 opacity-65" : "",
      ].join(" ")}
    >
      {dragHandle}
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left transition active:scale-[0.99]"
        aria-pressed={checked}
        disabled={disabled}
      >
        <TaskCheckControl checked={checked} />
        <span className="min-w-0 flex-1">
          <span
            className={[
              "block text-sm font-semibold leading-snug text-ink",
              checked ? "line-through" : "",
            ].join(" ")}
          >
            {showGroup ? (
              <span className="mr-1.5 rounded-full bg-card-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {taskGroupLabels[task.group]}
              </span>
            ) : null}
            {task.title}
          </span>
          {showMeta || task.description || task.note ? (
            <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
              {[
                showMeta ? resetLabels[task.resetType] : undefined,
                showMeta ? (task.characterScoped ? "캐릭터별" : "공통") : undefined,
                task.note ?? task.description,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
        </span>
      </button>
      {task.maxCount > 1 ? (
        <div className="flex shrink-0 items-center self-center rounded-full border border-[rgb(var(--color-line-soft))] bg-card/80 p-0.5">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-ink-muted disabled:opacity-35"
            onClick={() => onSetCount(cappedCount - 1)}
            disabled={disabled || cappedCount <= 0}
            aria-label={`${task.title} 줄이기`}
          >
            <Minus aria-hidden size={14} />
          </button>
          <span className="min-w-8 text-center text-[11px] font-bold text-ink">
            {cappedCount}/{task.maxCount}
          </span>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-primary disabled:opacity-35"
            onClick={() => onSetCount(cappedCount + 1)}
            disabled={disabled || cappedCount >= task.maxCount}
            aria-label={`${task.title} 늘리기`}
          >
            <Plus aria-hidden size={14} />
          </button>
        </div>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="min-h-11 shrink-0 self-center rounded-full px-2.5 py-1 text-xs font-bold text-[rgb(var(--color-danger))]"
          onClick={onRemove}
        >
          삭제
        </button>
      ) : null}
    </div>
  );
};
