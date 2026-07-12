import { useMemo, useState } from "react";
import { defaultTaskTemplates } from "../../data/tasks";
import { matchesManagedTask, type ResetFilter } from "../../domain/tasks/taskResetPresentation";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useCurrentDisabledDefaultTaskIds } from "../../stores/useCurrentDisabledDefaultTaskIds";
import { useTaskStore } from "../../stores/useTaskStore";
import type { TaskGroup } from "../../types";
import { ManagedTaskGroup } from "./ManagedTaskGroup";

const groupOrder:TaskGroup[]=["roulette","delivery","combat","pvp","housing","lifestyle","event","custom"];
type Props={query?:string;status?:"enabled"|"hidden"|"all";resetFilter?:ResetFilter};

export const DefaultTaskManager=({query="",status="enabled",resetFilter="all"}:Props)=>{
  const characterId=useCharacterStore(state=>state.activeCharacterId);
  const character=useCharacterStore(state=>state.characters.find(item=>item.id===state.activeCharacterId));
  const disabledIds=useCurrentDisabledDefaultTaskIds();
  const toggleTask=useTaskStore(state=>state.toggleDefaultTaskEnabled);
  const [openGroups,setOpenGroups]=useState<TaskGroup[]>(["roulette","delivery","combat"]);
  const disabledSet=useMemo(()=>new Set(disabledIds),[disabledIds]);
  const groups=useMemo(()=>groupOrder.flatMap(group=>{const tasks=defaultTaskTemplates.filter(task=>task.group===group&&matchesManagedTask(task,query,resetFilter)&&(status==="all"||(status==="hidden")===disabledSet.has(task.id)));return tasks.length?[{group,tasks}]:[];}),[disabledSet,query,resetFilter,status]);
  return <section className="card"><div className="mb-3"><p className="muted-label">기본 숙제 관리</p><h2 className="text-lg font-bold">표시할 기본 숙제</h2></div><p className="mb-3 text-xs font-medium text-ink-muted">캐릭터별 숙제 표시 설정은 현재 캐릭터{character?` (${character.name})`:""}에만 적용됩니다.</p><div className="space-y-2">{groups.map(({group,tasks})=><ManagedTaskGroup key={group} group={group} tasks={tasks} isOpen={openGroups.includes(group)} disabledSet={disabledSet} onToggleOpen={()=>setOpenGroups(value=>value.includes(group)?value.filter(item=>item!==group):[...value,group])} onToggleTask={taskId=>toggleTask(taskId,characterId)}/>)}{groups.length===0?<p className="rounded-lg bg-surface-muted p-4 text-center text-sm text-ink-muted">조건에 맞는 기본 숙제가 없습니다.</p>:null}</div></section>;
};
