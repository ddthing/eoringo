import type { TaskTemplate } from "../../types";
import { resetRuleLabels } from "../../domain/tasks/taskResetPresentation";

type Props = { task:TaskTemplate; enabled:boolean; onToggle:()=>void };
export const ManagedTaskRow = ({task,enabled,onToggle}:Props) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{task.title}</p>
      <p className="text-xs leading-relaxed text-ink-muted">
        {[resetRuleLabels[task.resetRuleId],task.availabilityRuleId?"금요일 17:00부터 참여 가능":undefined,task.retentionDays?`최대 ${task.retentionDays}일 보유`:undefined,task.note].filter(Boolean).join(" · ")}
      </p>
    </div>
    <button type="button" className={`min-h-11 shrink-0 rounded-full px-3 py-1 text-xs font-bold transition active:scale-[0.98] ${enabled?"bg-brand-soft text-brand":"bg-surface-muted text-ink-muted"}`} aria-pressed={enabled} onClick={onToggle}>{enabled?"켜짐":"꺼짐"}</button>
  </div>
);
