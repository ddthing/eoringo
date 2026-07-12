import { Minus, Plus } from "lucide-react";
import { useAllowanceStore } from "../../stores/useAllowanceStore";
import { getNextLeveAccrualDate, LEVE_ALLOWANCE_MAX } from "../../domain/allowances/leveAllowances";
import { formatInTimeZone } from "date-fns-tz";
import { getKstDateKey, KST_TIME_ZONE } from "../../lib/date";

export const AllowanceCard = () => {
  const value = useAllowanceStore((state) => state.value);
  const setValue = useAllowanceStore((state) => state.setValue);
  const now = new Date();
  const next = getNextLeveAccrualDate(now);
  const dayLabel = getKstDateKey(next) === getKstDateKey(now) ? "오늘" : "내일";

  return (
    <section className="card" aria-live="polite">
      <p className="muted-label">수주권</p>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" aria-label="수주권 1장 줄이기" className="grid h-11 w-11 place-items-center rounded-full bg-card-soft" onClick={() => setValue(value - 1)}>
          <Minus aria-hidden />
        </button>
        <label>
          <span className="sr-only">수주권 수량</span>
          <input type="number" min={0} max={100} value={value} onChange={(event) => setValue(Number(event.target.value))} className="w-16 bg-transparent text-center text-2xl font-black tabular-nums" />
          <span className="text-sm text-ink-muted">/100</span>
        </label>
        <button type="button" aria-label="수주권 1장 늘리기" className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary" onClick={() => setValue(value + 1)}>
          <Plus aria-hidden />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">{value >= LEVE_ALLOWANCE_MAX ? "최대 보유 중" : `다음 +3 · ${dayLabel} ${formatInTimeZone(next,KST_TIME_ZONE,"HH:mm")}`}</p>
    </section>
  );
};
