import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { defaultTaskTemplates, taskGroupLabels } from "../../data/tasks";
import { useTaskStore } from "../../stores/useTaskStore";
import type { TaskGroup } from "../../types";

const resetLabels = {
  daily: "일일",
  weekly: "주간",
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

export const DefaultTaskManager = () => {
  const disabledDefaultTaskIds = useTaskStore((state) => state.disabledDefaultTaskIds);
  const toggleDefaultTaskEnabled = useTaskStore((state) => state.toggleDefaultTaskEnabled);
  const [openGroups, setOpenGroups] = useState<TaskGroup[]>(["roulette", "delivery", "combat"]);
  const disabledSet = new Set(disabledDefaultTaskIds);

  return (
    <section className="card">
      <div className="mb-3">
        <p className="muted-label">기본 숙제 관리</p>
        <h2 className="text-lg font-bold">표시할 기본 숙제</h2>
      </div>
      <div className="space-y-2">
        {groupOrder.map((group) => {
          const tasks = defaultTaskTemplates.filter((task) => task.group === group);

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
                            {resetLabels[task.resetType]} ·{" "}
                            {task.characterScoped ? "캐릭터별" : "공통"}
                            {task.note ? ` · ${task.note}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={[
                            "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                            enabled
                              ? "bg-brand-soft text-brand"
                              : "bg-surface-muted text-ink-muted",
                          ].join(" ")}
                          onClick={() => toggleDefaultTaskEnabled(task.id)}
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
