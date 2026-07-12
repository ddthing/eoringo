import { ChevronDown } from "lucide-react";
import type { TaskGroup, TaskTemplate } from "../../types";
import { taskGroupLabels } from "../../data/tasks";
import { ManagedTaskRow } from "./ManagedTaskRow";

type Props={group:TaskGroup;tasks:TaskTemplate[];isOpen:boolean;disabledSet:Set<string>;completedAt:Record<string,string>;now:Date;onToggleOpen:()=>void;onToggleTask:(taskId:string)=>void};
export const ManagedTaskGroup=({group,tasks,isOpen,disabledSet,completedAt,now,onToggleOpen,onToggleTask}:Props)=>{const enabledCount=tasks.filter(task=>!disabledSet.has(task.id)).length;return <div className="rounded-lg bg-surface-muted"><button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left" onClick={onToggleOpen} aria-expanded={isOpen}><span><span className="block font-bold">{taskGroupLabels[group]}</span><span className="text-xs text-ink-muted">{enabledCount}/{tasks.length}개 표시</span></span><ChevronDown aria-hidden size={18} className={isOpen?"rotate-180 transition":"transition"}/></button>{isOpen?<div className="space-y-1 px-2 pb-2">{tasks.map(task=><ManagedTaskRow key={task.id} task={task} enabled={!disabledSet.has(task.id)} completedAt={completedAt[task.id]} now={now} onToggle={()=>onToggleTask(task.id)}/>)}</div>:null}</div>};
