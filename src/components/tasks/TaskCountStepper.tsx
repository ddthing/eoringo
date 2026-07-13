import { Minus, Plus } from "lucide-react";

type Props = {
  title: string;
  count: number;
  maxCount: number;
  onChange: (count: number) => void;
  disabled?: boolean;
};

export const TaskCountStepper = ({
  title,
  count,
  maxCount,
  onChange,
  disabled = false,
}: Props) => {
  const cappedCount = Math.min(Math.max(0, count), maxCount);

  return (
    <div className="flex shrink-0 items-center" aria-label={`${title} 진행 횟수`}>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full text-ink-muted transition hover:bg-card-soft/70 active:scale-95 disabled:opacity-35"
        onClick={() => onChange(cappedCount - 1)}
        disabled={disabled || cappedCount <= 0}
        aria-label={`${title} 줄이기`}
      >
        <Minus aria-hidden size={14} />
      </button>
      <span className="min-w-10 px-1 text-center text-[11px] font-black tabular-nums text-ink">
        {cappedCount}/{maxCount}
      </span>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full text-primary transition hover:bg-primary-soft/60 active:scale-95 disabled:opacity-35"
        onClick={() => onChange(cappedCount + 1)}
        disabled={disabled || cappedCount >= maxCount}
        aria-label={`${title} 늘리기`}
      >
        <Plus aria-hidden size={14} />
      </button>
    </div>
  );
};
