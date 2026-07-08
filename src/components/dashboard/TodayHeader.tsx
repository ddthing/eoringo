import { useEffect, useState } from "react";
import { dailyTasks } from "../../data/tasks";
import { getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getTaskScopeId } from "../../domain/tasks/getTaskScopeId";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import {
  formatDurationKo,
  formatKoreanDate,
  getNextKstDailyReset,
  getTimeUntil,
} from "../../lib/date";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useTaskStore } from "../../stores/useTaskStore";
import { CharacterAvatar } from "../characters/CharacterAvatar";

export const TodayHeader = () => {
  const [now, setNow] = useState(() => new Date());
  const characters = useCharacterStore((state) => state.characters);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const completedByCharacter = useTaskStore((state) => state.completedByCharacter);
  const disabledDefaultTaskIds = useTaskStore((state) => state.disabledDefaultTaskIds);
  const customTaskTemplates = useTaskStore((state) => state.customTaskTemplates);
  const activeCharacter =
    characters.find((character) => character.id === activeCharacterId) ?? characters[0];
  const resetAt = getNextKstDailyReset(now);
  const remaining = getTimeUntil(resetAt, now);
  const tasks =
    getVisibleTaskTemplatesByCategory(disabledDefaultTaskIds, customTaskTemplates, "daily") ??
    dailyTasks;
  const completed = Object.fromEntries(
    tasks.map((task) => [
      task.id,
      completedByCharacter[getTaskScopeId(task, activeCharacterId)]?.[task.id],
    ]),
  );
  const progress = getTaskProgress(tasks, completed);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timerId);
  }, []);

  return (
    <section className="memo-card bg-card/82 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="muted-label">profile memo</p>
        <span className="sticker">
          today {progress.completed}/{progress.total}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <CharacterAvatar
          imageId={activeCharacter?.profileImageId}
          name={activeCharacter?.name ?? "나의 모험가"}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight">
            {activeCharacter?.name ?? "나의 모험가"}
          </h2>
          <p className="text-xs font-medium text-ink-muted">
            {activeCharacter?.server ?? "서버 미설정"}
          </p>
          <div className="mt-2 grid gap-1 text-xs text-ink-muted">
            <p>{formatKoreanDate(now)}</p>
            <p>reset {formatDurationKo(remaining)}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
