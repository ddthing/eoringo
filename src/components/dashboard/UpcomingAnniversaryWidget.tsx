import { getDaysFromTodayKst } from "../../lib/date";
import { getDdayLabel } from "../../domain/dday/getDdayLabel";
import { useDdayStore } from "../../stores/useDdayStore";

const formatDisplayDate = (dateKey: string) => dateKey.split("-").join(".");

export const UpcomingAnniversaryWidget = () => {
  const events = useDdayStore((state) => state.events);
  const upcomingEvents = [...events]
    .sort((a, b) => {
      const daysA = Math.abs(getDaysFromTodayKst(a.date));
      const daysB = Math.abs(getDaysFromTodayKst(b.date));

      return daysA === daysB ? a.date.localeCompare(b.date) : daysA - daysB;
    })
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[16px] border border-[rgb(var(--color-line-soft))] bg-card/95 p-3 shadow-soft">
      <div className="mb-3">
        <p className="muted-label">기념일</p>
        <h2 className="text-base font-black text-ink">기념일</h2>
      </div>
      <div className="grid gap-1.5">
        {upcomingEvents.map((event) => (
          <div
            key={event.id}
            className="grid grid-cols-[4.5rem_1fr] items-center gap-2 rounded-[12px] border border-[rgb(var(--color-line-muted))] bg-card-soft/62 p-2"
          >
            <span className="rounded-full bg-card px-2.5 py-1 text-center text-xs font-black text-primary">
              {getDdayLabel(event.date)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{event.title}</p>
              <p className="text-[11px] font-medium text-ink-muted">
                {formatDisplayDate(event.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
