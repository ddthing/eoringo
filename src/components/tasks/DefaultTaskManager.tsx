import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { defaultTaskTemplates, taskGroupLabels } from "../../data/tasks";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useTaskStore } from "../../stores/useTaskStore";
import type { TaskGroup } from "../../types";
import { matchesManagedTask, resetRuleLabels, type ResetFilter } from "../../domain/tasks/taskResetPresentation";

const resetLabels = {
  daily: "일일",
  weekly: "주간",
  eighteenHours: "18시간",
  manual: "수동",
};

const groupOrder: TaskGroup[] = [
  "roulette",
  "delivery",
  "combat",
  "pvp",
  "housing",
  "lifestyle",
  "event",
  "custom",
];

type Props={query?:string;status?:"enabled"|"hidden"|"all";resetFilter?:ResetFilter};
export const DefaultTaskManager = ({query="",status="enabled",resetFilter="all"}:Props) => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const activeCharacter = useCharacterStore((state) =>
    state.characters.find((character) => character.id === state.activeCharacterId),
  );
  const disabledDefaultTaskIds = useCurrentDisabledDefaultTaskIds();
  const toggleDefaultTaskEnabled = useTaskStore((state) => state.toggleDefaultTaskEnabled);
  const [openGroups, setOpenGroups] = useState<TaskGroup[]>(["roulette", "delivery", "combat"]);
  const disabledSet = new Set(disabledDefaultTaskIds);

  return (
    <section className="card">
      <div className="mb-3">
        <p className="muted-label">기본 숙제 관리</p>
        <h2 className="text-lg font-bold">표시할 기본 숙제</h2>
      </div>
      <p className="mb-3 text-xs font-medium text-ink-muted">
        캐릭터별 숙제 표시 설정은 현재 캐릭터
        {activeCharacter ? ` (${activeCharacter.name})` : ""}에만 적용됩니다.
      </p>
      <div className="space-y-2">
        {groupOrder.map((group) => {
          const tasks = defaultTaskTemplates.filter((task) => task.group === group && matchesManagedTask(task,query,resetFilter) && (status==="all" || (status==="hidden")===disabledSet.has(task.id)));

          if (tasks.length === 0) {
            return null;
          }

          const isOpen = openGroups.includes(group);
          const enabledCount = tasks.filter((task) => !disabledSet.has(task.id)).length;

          return (
            <div key={group} className="rounded-lg bg-surface-muted">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                onClick={() =>
                  setOpenGroups((value) =>
                    value.includes(group)
                      ? value.filter((item) => item !== group)
                      : [...value, group],
                  )
                }
              >
                <span>
                  <span className="block font-bold">{taskGroupLabels[group]}</span>
                  <span className="text-xs text-ink-muted">
                    {enabledCount}/{tasks.length}개 표시
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  size={18}
                  className={isOpen ? "rotate-180 transition" : "transition"}
                />
              </button>
              {isOpen ? (
                <div className="space-y-1 px-2 pb-2">
                  {tasks.map((task) => {
                    const enabled = !disabledSet.has(task.id);

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{task.title}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {[
                              resetRuleLabels[task.resetRuleId] ?? resetLabels[task.resetType],
                              task.availabilityRuleId ? "금요일 17:00부터 참여 가능" : undefined,
                              task.retentionDays ? `최대 ${task.retentionDays}일 보유` : undefined,
                              task.characterScoped ? undefined : "공통",
                              task.note,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={[
                            "min-h-11 shrink-0 rounded-full px-3 py-1 text-xs font-bold transition active:scale-[0.98]",
                            enabled
                              ? "bg-brand-soft text-brand"
                              : "bg-surface-muted text-ink-muted",
                          ].join(" ")}
                          onClick={() => toggleDefaultTaskEnabled(task.id, activeCharacterId)}
                        >
                          {enabled ? "켜짐" : "꺼짐"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
