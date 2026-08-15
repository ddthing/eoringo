import { useMemo } from "react";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import { getUpcomingAnniversaries } from "../../domain/dday/anniversaryManagement";
import { useDdayStore } from "../../stores/useDdayStore";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

const formatDisplayDate = (dateKey: string) => dateKey.split("-").join(".");
const emptyEvents = [] as const;

export const UpcomingAnniversaryWidget = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const events = useDdayStore((state) => state.eventsByCharacter[activeCharacterId] ?? emptyEvents);
  const upcomingEvents = useMemo(() => getUpcomingAnniversaries([...events]), [events]);

  return (
    <section className="home-panel p-4 min-[420px]:p-[18px] md:p-5">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <h2 className="home-heading text-base font-bold tracking-[-0.02em] text-ink">다가오는 기념일</h2>
        </div>
        <Link to="/calendar" className="secondary-button home-touch-target gap-1.5">
          일정에서 관리 <ArrowRight aria-hidden size={14} />
        </Link>
      </div>
      {upcomingEvents.length === 0 ? (
        <div className="home-empty-state min-h-20">
          <CalendarDays aria-hidden size={17} />
          <p>등록된 기념일이 없습니다. 일정에서 추가할 수 있어요.</p>
        </div>
      ) : (
        <div className="grid gap-1.5">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="grid min-h-12 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 rounded-ui-md border border-[rgb(var(--color-line-muted))] bg-card-soft/62 p-2"
            >
              <span className="rounded-full bg-card px-2.5 py-1 text-center text-xs font-bold tabular-nums text-primary">
                {getDdayLabel(event.date)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{event.title}</p>
                <p className="text-[11px] font-medium tabular-nums text-ink-muted">
                  {formatDisplayDate(event.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
