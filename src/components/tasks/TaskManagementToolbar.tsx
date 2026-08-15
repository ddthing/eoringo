import { RotateCcw, Search } from "lucide-react";
import type { ResetFilter } from "../../domain/tasks/taskResetPresentation";
import { Button, Card, Input, SegmentedControl } from "../ui";

export type TaskStatusFilter = "enabled" | "hidden" | "all";
type Props = { query:string; status:TaskStatusFilter; resetFilter:ResetFilter; resultCount:number; onQueryChange:(value:string)=>void; onStatusChange:(value:TaskStatusFilter)=>void; onResetFilterChange:(value:ResetFilter)=>void; onReset:()=>void };
const statusFilters: Array<[TaskStatusFilter,string]> = [["enabled","활성"],["hidden","숨김"],["all","전체"]];
const resetFilters: Array<[ResetFilter,string]> = [["all","전체"],["daily","일일"],["weekly","주간"],["interval","18시간"],["manual","수동"]];

export const TaskManagementToolbar = ({query,status,resetFilter,resultCount,onQueryChange,onStatusChange,onResetFilterChange,onReset}:Props) => (
  <Card className="space-y-3">
    <div className="flex items-center justify-end gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={onReset} className="gap-1.5" aria-label="숙제 필터 초기화">
        <RotateCcw aria-hidden size={14}/>
        초기화
      </Button>
    </div>
    <label className="flex min-h-11 items-center gap-2 rounded-xl bg-card-soft px-3">
      <Search aria-hidden size={16}/>
      <Input value={query} onChange={(event)=>onQueryChange(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus:border-transparent focus:shadow-none" placeholder="숙제 검색…" aria-label="관리할 숙제 검색" />
    </label>
    <div className="ui-task-status-control">
      <div className="ui-task-status-summary" aria-live="polite">
        <span className="ui-segmented-label">{resultCount}개 숙제</span>
      </div>
      <SegmentedControl
        value={status}
        options={statusFilters.map(([value, label]) => ({ value, label }))}
        onChange={onStatusChange}
        aria-label="숙제 상태 필터"
        className="ui-task-status-options"
      />
    </div>
    <SegmentedControl
      value={resetFilter}
      options={resetFilters.map(([value, label]) => ({ value, label }))}
      onChange={onResetFilterChange}
      aria-label="초기화 필터"
      className="ui-segmented-control-scrollable"
    />
  </Card>
);
