import { Check, Minus, Plus } from "lucide-react";
import { taskGroupLabels } from "../../data/tasks";
import type { TaskTemplate } from "../../types";

type TaskItemProps = {
  task: TaskTemplate;
  count: number;
  onToggle: () => void;
  onSetCount: (count: number) => void;
  onRemove?: () => void;
  showMeta?: boolean;
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
}: TaskItemProps) => {
  const cappedCount = Math.min(count, task.maxCount);
  const checked = cappedCount >= task.maxCount;

  return (
    <div
      className={[
        "flex min-h-12 items-center gap-2.5 border-b border-[rgb(var(--color-line-muted))] px-3 py-2 last:border-b-0",
        checked ? "opacity-70" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 text-left transition active:scale-[0.99]"
        aria-pressed={checked}
      >
        <span
          className={[
            "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition",
            checked
              ? "border-primary bg-primary text-white shadow-[0_1px_4px_rgb(30_35_40/0.08)]"
              : "border-[rgb(var(--color-line-soft))] bg-card text-ink-muted",
          ].join(" ")}
        >
          {checked ? <Check aria-hidden size={12} strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={[
              "block text-sm font-semibold leading-snug text-ink",
              checked ? "line-through" : "",
            ].join(" ")}
          >
            <span className="mr-1.5 rounded-full bg-card-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {taskGroupLabels[task.group]}
            </span>
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
            className="grid h-10 w-10 place-items-center rounded-full text-ink-muted disabled:opacity-35"
            onClick={() => onSetCount(cappedCount - 1)}
            disabled={cappedCount <= 0}
            aria-label={`${task.title} 줄이기`}
          >
            <Minus aria-hidden size={14} />
          </button>
          <span className="min-w-8 text-center text-[11px] font-bold text-ink">
            {cappedCount}/{task.maxCount}
          </span>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-primary disabled:opacity-35"
            onClick={() => onSetCount(cappedCount + 1)}
            disabled={cappedCount >= task.maxCount}
            aria-label={`${task.title} 늘리기`}
          >
            <Plus aria-hidden size={14} />
          </button>
        </div>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="min-h-10 shrink-0 self-center rounded-full px-2.5 py-1 text-xs font-bold text-[rgb(var(--color-danger))]"
          onClick={onRemove}
        >
          삭제
        </button>
      ) : null}
    </div>
  );
};
