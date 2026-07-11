import { useEffect, useState } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
import {
  formatDurationKo,
  formatKoreanDate,
  getNextKstDailyReset,
  getTimeUntil,
} from "../../lib/date";
import { selectActiveCharacter } from "../../stores/character/selectors";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { CharacterAvatar } from "../characters/CharacterAvatar";
import { CharacterBottomSheet } from "../characters/CharacterBottomSheet";
import { useHomeTaskProgress } from "./useHomeTaskProgress";

export const HomeHero = () => {
  const [now, setNow] = useState(() => new Date());
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = useState(false);
  const character = useCharacterStore(selectActiveCharacter);
  const { daily } = useHomeTaskProgress();
  const remaining = getTimeUntil(getNextKstDailyReset(now), now);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <section className="home-panel overflow-hidden p-4 min-[420px]:p-[18px] md:p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="home-identity-trigger -m-1 flex min-h-20 min-w-0 flex-1 touch-manipulation items-start gap-3 rounded-[16px] p-1 text-left focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={() => setIsCharacterSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isCharacterSheetOpen}
            aria-label="캐릭터 전환 열기"
          >
            <CharacterAvatar
              imageId={character?.profileImageId}
              name={character?.name ?? "나의 모험가"}
              size="lg"
            />
            <div className="min-w-0 flex-1 py-0.5">
              <h1 className="home-heading truncate text-xl font-black leading-tight tracking-[-0.025em] text-ink min-[420px]:text-[22px]">
                {character?.name ?? "나의 모험가"}
              </h1>
              <span className="mt-1 inline-flex min-h-6 items-center gap-1 text-[13px] font-semibold text-ink-muted">
                {character?.server ?? "서버 미설정"}
                <ChevronDown aria-hidden size={14} />
              </span>
            </div>
          </button>
          <div className="min-w-[4.25rem] shrink-0 pt-1 text-right">
            <p className="text-[26px] font-black leading-none tracking-[-0.04em] text-primary tabular-nums min-[420px]:text-[28px]">{daily.percent}%</p>
            <p className="mt-1.5 text-[10px] font-bold tracking-[-0.01em] text-ink-muted">오늘 완료율</p>
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-[rgb(var(--color-line-muted))] pt-3 text-[11px] font-semibold leading-5 text-ink-muted min-[420px]:text-xs">
          <span className="tabular-nums">{formatKoreanDate(now)}</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock3 aria-hidden size={14} />
            초기화까지 {formatDurationKo(remaining)}
          </span>
        </div>
      </div>
      <CharacterBottomSheet
        isOpen={isCharacterSheetOpen}
        onClose={() => setIsCharacterSheetOpen(false)}
      />
    </section>
  );
};
