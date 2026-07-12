import type { DdayEvent } from "../../types";
export const validateAnniversaryDraft=(title:string,date:string)=>({title:!title.trim()?"기념일 이름을 입력해주세요.":"",date:!date?"날짜를 선택해주세요.":""});
export const sortAnniversaries=(events:DdayEvent[])=>[...events].sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,"ko"));
