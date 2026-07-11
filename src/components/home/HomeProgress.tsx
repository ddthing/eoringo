import { useHomeTaskProgress } from "./useHomeTaskProgress";

const ProgressRow = ({
  label,
  completed,
  total,
  percent,
}: {
  label: string;
  completed: number;
  total: number;
  percent: number;
}) => (
  <div className="py-2.5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-bold text-ink min-[420px]:text-sm">{label}</span>
      <span className="text-[11px] font-bold tabular-nums text-ink-muted">
        {completed}/{total} · {percent}%
      </span>
    </div>
    <div
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-soft"
      role="progressbar"
      aria-label={`${label} 숙제 진행률`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

export const HomeProgress = () => {
  const progress = useHomeTaskProgress();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress.total.percent / 100);

  return (
    <section className="home-panel flex h-full flex-col p-4 min-[420px]:p-[18px] md:p-5">
      <div>
        <p className="muted-label">루틴</p>
        <h2 className="home-heading mt-1 text-base font-black tracking-[-0.02em] text-ink">숙제 진행도</h2>
      </div>
      <div className="mt-4 grid flex-1 grid-cols-[92px_1fr] items-center gap-4 max-[360px]:grid-cols-1 min-[420px]:grid-cols-[104px_1fr] min-[420px]:gap-5 md:grid-cols-[116px_1fr]">
        <div className="relative mx-auto h-[92px] w-[92px] min-[420px]:h-[104px] min-[420px]:w-[104px] md:h-[116px] md:w-[116px]" aria-label={`전체 완료율 ${progress.total.percent}%`}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgb(var(--color-line-muted))" strokeWidth="9" />
            <circle
              cx="50" cy="50" r={radius} fill="none" stroke="rgb(var(--color-primary))" strokeWidth="9"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <strong className="text-xl font-black tracking-[-0.04em] text-ink tabular-nums min-[420px]:text-2xl">{progress.total.percent}%</strong>
            <span className="text-[10px] font-bold text-ink-muted">전체</span>
          </div>
        </div>
        <div>
          <ProgressRow label="일일" {...progress.daily} />
          <ProgressRow label="주간" {...progress.weekly} />
          <ProgressRow label="기타" {...progress.other} />
        </div>
      </div>
    </section>
  );
};
