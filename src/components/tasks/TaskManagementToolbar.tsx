import { RotateCcw, Search } from "lucide-react";
import type { ResetFilter } from "../../domain/tasks/taskResetPresentation";

export type TaskStatusFilter = "enabled" | "hidden" | "all";
type Props = { query:string; status:TaskStatusFilter; resetFilter:ResetFilter; resultCount:number; onQueryChange:(value:string)=>void; onStatusChange:(value:TaskStatusFilter)=>void; onResetFilterChange:(value:ResetFilter)=>void; onReset:()=>void };
const statusFilters: Array<[TaskStatusFilter,string]> = [["enabled","활성"],["hidden","숨김"],["all","전체"]];
const resetFilters: Array<[ResetFilter,string]> = [["all","전체"],["daily","일일"],["weekly","주간"],["interval","18시간"],["manual","수동"]];
const chipClassName = "min-h-11 shrink-0 rounded-full bg-card-soft px-3 text-xs font-bold text-ink-muted transition";

export const TaskManagementToolbar = ({query,status,resetFilter,resultCount,onQueryChange,onStatusChange,onResetFilterChange,onReset}:Props) => (
  <section className="card space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-bold text-ink">{resultCount}개 숙제</p>
      <button type="button" onClick={onReset} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-ink-muted transition hover:bg-card-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="숙제 필터 초기화">
        <RotateCcw aria-hidden size={14}/>
        초기화
      </button>
    </div>
    <label className="flex min-h-11 items-center gap-2 rounded-xl bg-card-soft px-3">
      <Search aria-hidden size={16}/>
      <input value={query} onChange={(event)=>onQueryChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="숙제 검색…" aria-label="관리할 숙제 검색" />
    </label>
    <div className="flex gap-1 overflow-x-auto" aria-label="숙제 상태 필터">
      {statusFilters.map(([value,label])=><button type="button" key={value} aria-pressed={status===value} onClick={()=>onStatusChange(value)} className={`${chipClassName} ${status===value?"bg-primary text-white":""}`}>{label}</button>)}
    </div>
    <div className="flex gap-1 overflow-x-auto" aria-label="초기화 필터">
      {resetFilters.map(([value,label])=><button type="button" key={value} aria-pressed={resetFilter===value} onClick={()=>onResetFilterChange(value)} className={`${chipClassName} ${resetFilter===value?"bg-primary text-white":""}`}>{label}</button>)}
    </div>
  </section>
);
