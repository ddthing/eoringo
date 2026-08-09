import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { defaultTaskTemplates } from "../../data/tasks";
import { getManagedTaskResults } from "../../domain/tasks/getManagedTaskResults";
import type { ResetFilter } from "../../domain/tasks/taskResetPresentation";
import { useCurrentCustomTaskTemplates } from "../../stores/useCurrentCustomTaskTemplates";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useMinuteNow } from "../../hooks/useMinuteNow";
import { CharacterSwitcher } from "../characters/CharacterSwitcher";
import { CustomTaskList } from "../dashboard/CustomTaskList";
import { AllowanceCard } from "./AllowanceCard";
import { DefaultTaskManager } from "./DefaultTaskManager";
import { TaskManagementToolbar, type TaskStatusFilter } from "./TaskManagementToolbar";

export const TaskManagementPage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatusFilter>("enabled");
  const [resetFilter, setResetFilter] = useState<ResetFilter>("all");
  const now = useMinuteNow();
  const disabledIds = useCurrentDisabledDefaultTaskIds();
  const customTasks = useCurrentCustomTaskTemplates();
  const taskResults = useMemo(
    () => getManagedTaskResults({
      defaultTasks: defaultTaskTemplates,
      customTasks,
      disabledDefaultTaskIds: disabledIds,
      query,
      status,
      resetFilter,
    }),
    [customTasks, disabledIds, query, resetFilter, status],
  );

  const resetFilters = () => {
    setQuery("");
    setStatus("enabled");
    setResetFilter("all");
  };

  return (
    <div className="space-y-4">
      <header className="flex gap-3">
        <Link to="/tasks" aria-label="숙제로 돌아가기" className="grid h-11 w-11 place-items-center rounded-full bg-card"><ArrowLeft aria-hidden size={18}/></Link>
        <div><p className="muted-label">상세 관리</p><h1 className="text-xl font-black">숙제 관리</h1><p className="text-xs text-ink-muted">표시할 숙제와 초기화 주기를 관리합니다.</p></div>
      </header>
      <section><p className="muted-label mb-1.5">관리 대상</p><CharacterSwitcher compact showCurrentSummary={false} showSelectionCheck/></section>
      <div className="grid gap-3 md:grid-cols-2">
        <AllowanceCard />
        <TaskManagementToolbar query={query} status={status} resetFilter={resetFilter} resultCount={taskResults.resultCount} onQueryChange={setQuery} onStatusChange={setStatus} onResetFilterChange={setResetFilter} onReset={resetFilters}/>
      </div>
      <DefaultTaskManager tasks={taskResults.defaultTasks} query={query} status={status} resetFilter={resetFilter} now={now}/>
      <CustomTaskList tasks={taskResults.customTasks} query={query} status={status} resetFilter={resetFilter}/>
    </div>
  );
};
