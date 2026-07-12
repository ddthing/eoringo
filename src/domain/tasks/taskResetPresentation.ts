import type { ResetRuleId, TaskTemplate } from "../../types";
export type ResetFilter = "all" | "daily" | "weekly" | "interval" | "manual";
export const resetRuleLabels: Record<ResetRuleId,string>={"daily-midnight":"매일 00:00","daily-0500":"매일 05:00","daily-1700":"매일 17:00","weekly-tue-1700":"화요일 17:00","weekly-fri-1700":"금요일 17:00","weekly-sat-2100":"토요일 21:00","interval-18h":"완료 후 18시간",manual:"수동 초기화"};
export const getResetFilter=(id:ResetRuleId):ResetFilter=>id.startsWith("daily-")?"daily":id.startsWith("weekly-")?"weekly":id==="interval-18h"?"interval":"manual";
export const matchesManagedTask=(task:TaskTemplate,query:string,filter:ResetFilter)=>{const q=query.trim().toLocaleLowerCase("ko");const text=[task.title,task.description,task.note].filter(Boolean).join(" ").toLocaleLowerCase("ko");return(!q||text.includes(q))&&(filter==="all"||getResetFilter(task.resetRuleId)===filter);};
