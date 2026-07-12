import type { ResetRuleId, TaskTemplate } from "../../types";
import { addDays, addHours } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { getKstNow, KST_TIME_ZONE } from "../../lib/date";
import { resetRuleRegistry } from "./resetRules";
export type ResetFilter = "all" | "daily" | "weekly" | "interval" | "manual";
export const resetRuleLabels: Record<ResetRuleId,string>={"daily-midnight":"매일 00:00","daily-0500":"매일 05:00","daily-1700":"매일 17:00","weekly-tue-1700":"화요일 17:00","weekly-fri-1700":"금요일 17:00","weekly-sat-2100":"토요일 21:00","interval-18h":"완료 후 18시간",manual:"수동 초기화"};
export const getResetFilter=(id:ResetRuleId):ResetFilter=>id.startsWith("daily-")?"daily":id.startsWith("weekly-")?"weekly":id==="interval-18h"?"interval":"manual";
export const matchesManagedTask=(task:TaskTemplate,query:string,filter:ResetFilter)=>{const q=query.trim().toLocaleLowerCase("ko");const text=[task.title,task.description,task.note].filter(Boolean).join(" ").toLocaleLowerCase("ko");return(!q||text.includes(q))&&(filter==="all"||getResetFilter(task.resetRuleId)===filter);};

export const getNextTaskReset = (ruleId:ResetRuleId, now=new Date(), completedAt?:string) => {
  const rule=resetRuleRegistry[ruleId];
  if(rule.kind==="interval") { const completed=completedAt?new Date(completedAt):null; return completed&&Number.isFinite(completed.getTime())?addHours(completed,rule.durationHours):null; }
  if(rule.kind==="manual") return null;
  const zoned=getKstNow(now); let target=new Date(zoned.getFullYear(),zoned.getMonth(),zoned.getDate(),rule.hour,rule.minute);
  if(rule.kind==="daily") { if(target<=zoned) target=addDays(target,1); }
  else { let days=(rule.weekday-zoned.getDay()+7)%7; if(days===0&&target<=zoned)days=7; target=addDays(target,days); }
  return fromZonedTime(target,KST_TIME_ZONE);
};

export const formatResetRemaining=(target:Date|null,now=new Date())=>{if(!target)return "";const minutes=Math.max(0,Math.ceil((target.getTime()-now.getTime())/60000));const days=Math.floor(minutes/1440);const hours=Math.floor((minutes%1440)/60);const rest=minutes%60;return `다음 초기화까지 ${days?`${days}일 `:""}${hours?`${hours}시간 `:""}${rest}분`;};
