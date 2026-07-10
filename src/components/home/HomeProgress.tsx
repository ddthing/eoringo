import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useHomeTaskProgress } from "./useHomeTaskProgress";

const ProgressRow = ({ label, completed, total }: { label: string; completed: number; total: number }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-sm font-bold text-ink">{label}</span>
    <span className="text-xs font-bold tabular-nums text-ink-muted">{completed}/{total}</span>
  </div>
);

export const HomeProgress = () => {
  const progress = useHomeTaskProgress();
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress.total.percent / 100);

  return (
    <section className="home-panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="muted-label">루틴</p>
          <h2 className="mt-1 text-base font-black text-ink">숙제 진행도</h2>
        </div>
        <Link to="/tasks" className="secondary-button gap-1.5" aria-label="전체 숙제 보기">
          전체 숙제 보기 <ArrowRight aria-hidden size={14} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-[116px_1fr] items-center gap-5 max-[390px]:grid-cols-1">
        <div className="relative mx-auto h-[116px] w-[116px]" aria-label={`전체 완료율 ${progress.total.percent}%`}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgb(var(--color-line-muted))" strokeWidth="9" />
            <circle
              cx="50" cy="50" r={radius} fill="none" stroke="rgb(var(--color-primary))" strokeWidth="9"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <strong className="text-2xl font-black text-ink">{progress.total.percent}%</strong>
            <span className="text-[10px] font-bold text-ink-muted">전체</span>
          </div>
        </div>
        <div className="divide-y divide-[rgb(var(--color-line-muted))]">
          <ProgressRow label="일일" {...progress.daily} />
          <ProgressRow label="주간" {...progress.weekly} />
          <ProgressRow label="기타" {...progress.other} />
        </div>
      </div>
    </section>
  );
};
