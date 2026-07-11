import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { HomeTodayCheckItem } from "./HomeTodayCheckItem";
import { useHomeTodayTasks } from "./useHomeTodayTasks";

export const HomeTodayCheck = () => {
  const { groups, toggle, setCount } = useHomeTodayTasks();
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const completed = groups.reduce((sum, group) => sum + group.completed, 0);

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
        {groups.map((group) => (
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
            ) : group.state === "complete" ? (
              <p className="flex min-h-12 items-center gap-2 text-xs font-bold text-primary">
                <CheckCircle2 aria-hidden size={16} /> 오늘 항목 완료
              </p>
            ) : (
              <>
                <div>
                  {group.displayedTasks.map((entry) => (
                    <HomeTodayCheckItem
                      key={entry.task.id}
                      {...entry}
                      onToggle={() => toggle(entry.task)}
                      onSetCount={(count) => setCount(entry.task, count)}
                    />
                  ))}
                </div>
                {group.remainingCount > 0 ? (
                  <p className="border-t border-[rgb(var(--color-line-muted))] pt-2 text-[11px] font-bold text-ink-muted">
                    + 미완료 {group.remainingCount}개
                  </p>
                ) : null}
              </>
            )}
          </section>
        ))}
      </div>

      <Link to="/tasks" className="secondary-button home-touch-target mt-3 w-full gap-1.5">
        전체 숙제 보기 <ArrowRight aria-hidden size={14} />
      </Link>
    </section>
  );
};
