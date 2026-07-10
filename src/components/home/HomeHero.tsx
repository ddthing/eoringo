import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  formatDurationKo,
  formatKoreanDate,
  getNextKstDailyReset,
  getTimeUntil,
} from "../../lib/date";
import { selectActiveCharacter } from "../../stores/character/selectors";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { CharacterAvatar } from "../characters/CharacterAvatar";
import { useHomeTaskProgress } from "./useHomeTaskProgress";

export const HomeHero = () => {
  const [now, setNow] = useState(() => new Date());
  const character = useCharacterStore(selectActiveCharacter);
  const { daily } = useHomeTaskProgress();
  const remaining = getTimeUntil(getNextKstDailyReset(now), now);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <section className="home-panel overflow-hidden p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <CharacterAvatar
          imageId={character?.profileImageId}
          name={character?.name ?? "나의 모험가"}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-ink sm:text-2xl">
                {character?.name ?? "나의 모험가"}
              </h1>
              <p className="mt-0.5 text-sm font-semibold text-ink-muted">
                {character?.server ?? "서버 미설정"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-black leading-none text-primary">{daily.percent}%</p>
              <p className="mt-1 text-[11px] font-bold text-ink-muted">오늘 완료율</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[rgb(var(--color-line-muted))] pt-3 text-xs font-semibold text-ink-muted">
            <span>{formatKoreanDate(now)}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden size={14} />
              초기화까지 {formatDurationKo(remaining)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
