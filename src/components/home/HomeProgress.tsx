import { useHomeDashboardTasks } from "./useHomeDashboardTasks";

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
  <div className="home-progress-row grid gap-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-bold text-ink">{label}</span>
      <span className="text-[11px] font-bold tabular-nums text-ink-muted">
        {completed}/{total} · {percent}%
      </span>
    </div>
    <div
      className="home-progress-track h-2 overflow-hidden rounded-full bg-card-soft"
      role="progressbar"
      aria-label={`${label} 숙제 진행률`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="home-progress-fill h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

export const HomeProgress = () => {
  const { progress } = useHomeDashboardTasks();

  return (
    <section className="home-panel home-progress-panel flex flex-col p-4 min-[420px]:p-[18px] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="home-heading text-base font-bold tracking-[-0.02em] text-ink">
            숙제 진행도
          </h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">오늘과 이번 주 현황</p>
        </div>
        <div className="text-right">
          <strong className="block text-2xl font-black leading-none tracking-[-0.04em] text-primary tabular-nums">
            {progress.total.percent}%
          </strong>
          <span className="mt-1 block text-[10px] font-bold text-ink-muted">
            {progress.total.completed}/{progress.total.total} 완료
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <ProgressRow label="일일" {...progress.daily} />
        <ProgressRow label="주간" {...progress.weekly} />
        {progress.other.total > 0 ? <ProgressRow label="기타" {...progress.other} /> : null}
      </div>
    </section>
  );
};
