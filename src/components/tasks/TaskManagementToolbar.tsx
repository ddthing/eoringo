import { ListFilter, RotateCcw, Search } from "lucide-react";
import type { ResetFilter } from "../../domain/tasks/taskResetPresentation";
import { Button, Card, Input, SegmentedControl } from "../ui";

export type TaskStatusFilter = "enabled" | "hidden" | "all";
type Props = { query:string; status:TaskStatusFilter; resetFilter:ResetFilter; resultCount:number; onQueryChange:(value:string)=>void; onStatusChange:(value:TaskStatusFilter)=>void; onResetFilterChange:(value:ResetFilter)=>void; onReset:()=>void };
const statusFilters: Array<[TaskStatusFilter,string]> = [["enabled","활성"],["hidden","숨김"],["all","전체"]];
const resetFilters: Array<[ResetFilter,string]> = [["all","전체"],["daily","일일"],["weekly","주간"],["interval","18시간"],["manual","수동"]];

export const TaskManagementToolbar = ({query,status,resetFilter,resultCount,onQueryChange,onStatusChange,onResetFilterChange,onReset}:Props) => (
  <Card className="ui-task-filter-card space-y-4 p-4">
    <div className="ui-task-filter-heading">
      <div className="ui-task-filter-heading-copy">
        <div className="ui-task-filter-title-row">
          <span className="ui-task-filter-icon" aria-hidden>
            <ListFilter size={16} strokeWidth={2.2}/>
          </span>
          <div>
            <p className="ui-section-eyebrow">표시 조건</p>
            <h2 className="ui-task-filter-title">숙제 필터</h2>
          </div>
        </div>
        <p className="ui-task-filter-result" aria-live="polite">{resultCount}개 숙제 표시 중</p>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onReset} className="gap-1.5" aria-label="숙제 필터 초기화">
        <RotateCcw aria-hidden size={14}/>
        초기화
      </Button>
    </div>

    <div className="ui-task-filter-field">
      <label className="ui-task-filter-label" htmlFor="task-management-search">숙제 검색</label>
      <div className="ui-task-filter-search">
        <Search aria-hidden size={16}/>
        <Input id="task-management-search" value={query} onChange={(event)=>onQueryChange(event.target.value)} placeholder="이름으로 숙제 찾기…" aria-label="관리할 숙제 검색" />
      </div>
    </div>

    <div className="ui-task-filter-section">
      <div className="ui-task-filter-section-heading">
        <span className="ui-task-filter-label">표시 상태</span>
        <span className="ui-task-filter-hint">활성·숨김 숙제</span>
      </div>
      <SegmentedControl
        value={status}
        options={statusFilters.map(([value, label]) => ({ value, label }))}
        onChange={onStatusChange}
        aria-label="숙제 상태 필터"
        className="ui-task-filter-status"
      />
    </div>

    <div className="ui-task-filter-section">
      <div className="ui-task-filter-section-heading">
        <span className="ui-task-filter-label">초기화 주기</span>
        <span className="ui-task-filter-hint">주기별로 좁혀보기</span>
      </div>
      <SegmentedControl
        value={resetFilter}
        options={resetFilters.map(([value, label]) => ({ value, label }))}
        onChange={onResetFilterChange}
        aria-label="초기화 필터"
        className="ui-task-filter-reset"
      />
    </div>
  </Card>
);
