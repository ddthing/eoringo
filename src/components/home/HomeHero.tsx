import { useState } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
import {
  formatDurationKo,
  getNextKstDailyReset,
  getTimeUntil,
} from "../../lib/date";
import { selectActiveCharacter } from "../../stores/character/selectors";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { CharacterAvatar } from "../characters/CharacterAvatar";
import { CharacterBottomSheet } from "../characters/CharacterBottomSheet";
import { useHomeDashboardTasks } from "./useHomeDashboardTasks";

export const HomeHero = () => {
  const now = useMinuteNow();
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = useState(false);
  const character = useCharacterStore(selectActiveCharacter);
  const { progress } = useHomeDashboardTasks();
  const remaining = getTimeUntil(getNextKstDailyReset(now), now);

  return (
    <section className="home-panel home-hero-panel overflow-hidden p-4 min-[420px]:p-[18px] md:p-6">
      <div className="home-hero-main">
        <button
          type="button"
          className="home-identity-trigger -m-1 flex min-h-20 min-w-0 flex-1 touch-manipulation items-start gap-3 rounded-ui-md p-1 text-left focus-visible:ring-2 focus-visible:ring-primary/35"
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
            <p className="home-panel-kicker">현재 캐릭터</p>
            <h2 className="home-heading mt-1 truncate text-xl font-extrabold leading-tight tracking-[-0.025em] text-ink min-[420px]:text-[22px]">
              {character?.name ?? "나의 모험가"}
            </h2>
            <span className="mt-1 inline-flex min-h-6 items-center gap-1 text-[13px] font-semibold text-ink-muted">
              {character?.server ?? "서버 미설정"}
              <ChevronDown aria-hidden size={14} />
            </span>
          </div>
        </button>
        <div className="home-hero-completion">
          <p className="home-panel-kicker">오늘 완료율</p>
          <strong className="home-hero-completion-value">{progress.daily.percent}%</strong>
          <div
            className="home-hero-progress"
            role="progressbar"
            aria-label="오늘 숙제 완료율"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.daily.percent}
          >
            <span style={{ width: `${progress.daily.percent}%` }} />
          </div>
        </div>
      </div>
      <div className="home-hero-footer">
        <div className="home-hero-stats" aria-label="숙제 요약">
          <span className="home-hero-stat">
            <span>오늘 숙제</span>
            <strong>
              {progress.daily.completed}<small>/{progress.daily.total}</small>
            </strong>
          </span>
          <span className="home-hero-stat">
            <span>이번 주</span>
            <strong>
              {progress.weekly.completed}<small>/{progress.weekly.total}</small>
            </strong>
          </span>
        </div>
        <span className="home-reset-countdown">
          <Clock3 aria-hidden size={15} />
          초기화까지 {formatDurationKo(remaining)}
        </span>
      </div>
      <CharacterBottomSheet
        isOpen={isCharacterSheetOpen}
        onClose={() => setIsCharacterSheetOpen(false)}
      />
    </section>
  );
};
