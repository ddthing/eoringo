import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import {
  formatDurationKo,
  formatKoreanDate,
  getNextKstDailyReset,
  getTimeUntil,
} from "../../lib/date";
import { getCharacterImage } from "../../lib/imageStorage";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useTaskStore } from "../../stores/useTaskStore";
import { CharacterAvatar } from "../characters/CharacterAvatar";

export const LockHero = () => {
  const [now, setNow] = useState(() => new Date());
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const characters = useCharacterStore((state) => state.characters);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const disabledDefaultTaskIds = useCurrentDisabledDefaultTaskIds();
  const customTaskTemplates = useTaskStore((state) => state.customTaskTemplates);
  const activeCharacter =
    characters.find((character) => character.id === activeCharacterId) ?? characters[0];
  const tasks = useMemo(
    () =>
      getVisibleTaskTemplatesByCategory(
        disabledDefaultTaskIds,
        customTaskTemplates,
        "daily",
      ),
    [customTaskTemplates, disabledDefaultTaskIds],
  );
  const completed = useMemo(
    () =>
      Object.fromEntries(
        tasks.map((task) => [
          task.id,
          completedByCharacter[getTaskScopeId(task, activeCharacterId)]?.[task.id],
        ]),
      ),
    [activeCharacterId, completedByCharacter, tasks],
  );
  const progress = useMemo(() => getTaskProgress(tasks, completed), [completed, tasks]);
  const remaining = getTimeUntil(getNextKstDailyReset(now), now);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;
    const imageId = activeCharacter?.profileImageId;

    if (!imageId) {
      setBackgroundImageUrl(null);
      return undefined;
    }

    getCharacterImage(imageId)
      .then((blob) => {
        if (!mounted || !blob) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setBackgroundImageUrl(objectUrl);
      })
      .catch(() => {
        if (mounted) {
          setBackgroundImageUrl(null);
        }
      });

    return () => {
      mounted = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeCharacter?.profileImageId]);

  return (
    <section className="relative isolate min-h-[224px] overflow-hidden rounded-[18px] border border-[rgb(var(--color-line-soft))] bg-card text-ink shadow-soft">
      {backgroundImageUrl ? (
        <img
          src={backgroundImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-42 blur-[1px] grayscale-[0.12]"
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgb(255_255_253/0.98),rgb(var(--color-card-soft)/0.92)_52%,rgb(238_241_235/0.94))]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_253/0.72),rgb(255_255_253/0.9)_48%,rgb(255_255_253/0.98))]" />

      <div className="relative flex min-h-[224px] flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black leading-none text-ink">
              {activeCharacter?.name ?? "나의 모험가"}
            </h1>
            <p className="mt-1 text-sm font-bold text-ink-muted">
              {activeCharacter?.server ?? "서버 미설정"}
            </p>
          </div>
          <CharacterAvatar
            imageId={activeCharacter?.profileImageId}
            name={activeCharacter?.name ?? "나의 모험가"}
            size="lg"
          />
        </div>

        <div className="rounded-[14px] border border-[rgb(var(--color-line-muted))] bg-card/72 p-3 backdrop-blur-md">
          <p className="text-sm font-bold text-ink">{formatKoreanDate(now)}</p>
          <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                <Clock3 aria-hidden size={14} />
                <span>초기화까지 {formatDurationKo(remaining)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-line-muted))]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
                today
              </p>
              <p className="text-2xl font-black leading-none">
                {progress.completed}/{progress.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
