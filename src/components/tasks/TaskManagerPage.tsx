import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, Settings2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { taskGroupLabels } from "../../data/tasks";
import { getTaskCount, getTaskProgress } from "../../domain/tasks/getTaskProgress";
import { getVisibleTaskTemplatesByCategory } from "../../domain/tasks/getVisibleTaskTemplates";
import {
  getTaskOrderScopeKey,
  sortTasksBySavedOrder,
  taskGroupOrder,
} from "../../domain/tasks/taskOrdering";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { reorderTaskIds, useTaskUiStore } from "../../stores/task/useTaskUiStore";
import { useTaskStore } from "../../stores/useTaskStore";
import type { TaskCategory, TaskTemplate } from "../../types";
import { CharacterSwitcher } from "../characters/CharacterSwitcher";
import { TaskItem } from "./TaskItem";
import { TaskOverview } from "./TaskOverview";
import { TaskOrderControls } from "./TaskOrderControls";

export const TaskManagerPage = () => {
  const characterId = useCharacterStore((state) => state.activeCharacterId);
  const disabledIds = useCurrentDisabledDefaultTaskIds();
  const customTasks = useCurrentCustomTaskTemplates();
  const completed = useTaskStore((state) => state.completedByCharacter[characterId]);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const setTaskCount = useTaskStore((state) => state.setTaskCount);
  const view = useTaskUiStore((state) => state.view);
  const collapsedGroups = useTaskUiStore((state) => state.collapsedGroups);
  const orderByGroup = useTaskUiStore((state) => state.orderByGroup);
  const setView = useTaskUiStore((state) => state.setView);
  const toggleGroup = useTaskUiStore((state) => state.toggleGroup);
  const setGroupOrder = useTaskUiStore((state) => state.setGroupOrder);
  const [query, setQuery] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [isOrderEditing, setIsOrderEditing] = useState(false);

  useEffect(() => { setIsOrderEditing(false); setDraggingTaskId(null); }, [characterId, view]);
  const category: TaskCategory = view;
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");

  const visibleTasks = useMemo(
    () => getVisibleTaskTemplatesByCategory(disabledIds, customTasks, category),
    [category, customTasks, disabledIds],
  );

  const groups = useMemo(
    () => taskGroupOrder.map((group) => {
      const scopeKey = getTaskOrderScopeKey(characterId, view, group);
      const tasks = sortTasksBySavedOrder(
        visibleTasks.filter((task) => task.group === group),
        orderByGroup[scopeKey] ?? [],
      );
      const filteredTasks = normalizedQuery
        ? tasks.filter((task) =>
            [task.title, task.description, task.note]
              .filter(Boolean)
              .some((value) => value?.toLocaleLowerCase("ko").includes(normalizedQuery)),
          )
        : tasks;
      return { group, scopeKey, tasks, filteredTasks };
    }).filter(({ tasks, filteredTasks }) =>
      tasks.length > 0 && (!normalizedQuery || filteredTasks.length > 0),
    ),
    [characterId, normalizedQuery, orderByGroup, view, visibleTasks],
  );

  const moveTask = (scopeKey: string, tasks: TaskTemplate[], sourceId: string, targetId: string) => {
    setGroupOrder(scopeKey, reorderTaskIds(tasks.map((task) => task.id), sourceId, targetId));
  };

  return (
    <div className="space-y-3.5">
      <header className="sticky top-[var(--app-header-height)] z-10 -mx-3 border-b border-[rgb(var(--color-line-soft))] bg-bg/95 px-3 pb-3 pt-1 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="muted-label">루틴</p>
            <h1 className="text-xl font-black text-ink">숙제 관리</h1>
          </div>
          <div className="grid grid-cols-2 rounded-[12px] bg-card-soft p-1" aria-label="숙제 기간">
            {(["daily", "weekly"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={[
                  "min-h-11 rounded-[9px] px-3 text-xs font-black transition",
                  view === item ? "bg-card text-primary shadow-sm" : "text-ink-muted",
                ].join(" ")}
                onClick={() => setView(item)}
                disabled={isOrderEditing}
              >
                {item === "daily" ? "오늘" : "주간"}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 rounded-[12px] border border-[rgb(var(--color-line-muted))] bg-card px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
          <Search aria-hidden size={16} className="text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={isOrderEditing}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted/60"
            placeholder="숙제 검색"
            aria-label="숙제 검색"
          />
          {query ? (
            <button type="button" className="grid h-11 w-11 place-items-center text-ink-muted" onClick={() => setQuery("")} aria-label="검색어 지우기">
              <X aria-hidden size={15} />
            </button>
          ) : null}
        </label>
      </header>

      <TaskOverview />
      <section className="space-y-1.5" aria-labelledby="task-character-label">
        <p id="task-character-label" className="muted-label px-0.5">숙제 대상</p>
        <CharacterSwitcher compact showCurrentSummary={false} showSelectionCheck disabled={isOrderEditing} />
      </section>

      <div className={`flex min-h-11 items-center justify-between rounded-[12px] px-3 ${isOrderEditing ? "bg-primary-soft" : "bg-card-soft/65"}`} aria-live="polite"><p className="text-xs font-bold text-ink-muted">{isOrderEditing ? "순서 편집 중 · 체크 입력이 잠겼습니다." : "숙제 순서를 변경할 수 있습니다."}</p><button type="button" className="min-h-11 shrink-0 px-2 text-xs font-black text-primary" onClick={()=>setIsOrderEditing(v=>!v)}>{isOrderEditing ? "편집 완료" : "순서 편집"}</button></div>

      <div className="space-y-3">
        {groups.map(({ group, scopeKey, tasks, filteredTasks }) => {
          const isCollapsed = collapsedGroups[scopeKey] && !normalizedQuery;
          const groupCompleted = Object.fromEntries(
            tasks.map((task) => [task.id, completed?.[task.id]]),
          );
          const progress = getTaskProgress(tasks, groupCompleted);

          return (
            <section key={scopeKey} className="overflow-hidden rounded-[14px] border border-[rgb(var(--color-line-soft))] bg-card shadow-[0_4px_16px_rgb(30_35_40/0.045)]">
              <button
                type="button"
                className="flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left transition hover:bg-card-soft/70"
                onClick={() => toggleGroup(scopeKey)}
                aria-expanded={!isCollapsed}
              >
                <span className="font-black text-ink">{taskGroupLabels[group]}</span>
                <span className="flex items-center gap-2 text-xs font-bold text-ink-muted">
                  {progress.completed}/{progress.total}
                  <ChevronDown aria-hidden size={16} className={`transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                </span>
              </button>
              {!isCollapsed ? (
                <div className="border-t border-[rgb(var(--color-line-muted))]">
                  {filteredTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={draggingTaskId === task.id ? "bg-primary-soft/55 opacity-60" : ""}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggingTaskId) moveTask(scopeKey, tasks, draggingTaskId, task.id);
                        setDraggingTaskId(null);
                      }}
                    >
                      <TaskItem
                        task={task}
                        count={getTaskCount(completed?.[task.id])}
                        showGroup={false}
                        dragHandle={isOrderEditing ? <TaskOrderControls title={task.title} canMoveUp={index>0} canMoveDown={index<filteredTasks.length-1} onMoveUp={()=>moveTask(scopeKey,tasks,task.id,filteredTasks[index-1].id)} onMoveDown={()=>moveTask(scopeKey,tasks,task.id,filteredTasks[index+1].id)} onDragStart={event=>{event.dataTransfer.effectAllowed="move";setDraggingTaskId(task.id);}} onDragEnd={()=>setDraggingTaskId(null)}/> : undefined}
                        disabled={isOrderEditing}
                        onToggle={() => toggleTask(characterId, task.id, task.maxCount, task.resetRuleId)}
                        onSetCount={(count) => setTaskCount(characterId, task.id, count, task.maxCount, task.resetRuleId)}
                      />
                    </div>
                  ))}
                  {filteredTasks.length === 0 ? (
                    <p className="px-4 py-5 text-center text-sm font-semibold text-ink-muted">검색 결과가 없습니다.</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
        {groups.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card/70 px-4 py-10 text-center">
            <Search aria-hidden size={20} className="mx-auto text-ink-muted/55" />
            <p className="mt-2 text-sm font-bold text-ink-muted">검색 결과가 없습니다.</p>
          </div>
        ) : null}
      </div>

      <Link to="/tasks/manage" className="flex min-h-11 items-center justify-center gap-2 border-t border-[rgb(var(--color-line-soft))] pt-2 text-sm font-black text-ink-muted">
        <Settings2 aria-hidden size={16} /> 상세 관리
      </Link>
    </div>
  );
};
