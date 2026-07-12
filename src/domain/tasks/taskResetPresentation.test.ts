import {describe,expect,it} from "vitest";
import {defaultTaskTemplates} from "../../data/tasks";
import {getResetFilter,matchesManagedTask,resetRuleLabels} from "./taskResetPresentation";
describe("task reset presentation",()=>{it("labels detailed rules",()=>{expect(resetRuleLabels["daily-0500"]).toBe("매일 05:00");expect(resetRuleLabels["interval-18h"]).toBe("완료 후 18시간");});it("groups reset filters",()=>{expect(getResetFilter("daily-1700")).toBe("daily");expect(getResetFilter("weekly-sat-2100")).toBe("weekly");});it("filters task text",()=>{const task=defaultTaskTemplates.find(t=>t.id==="daily-island-pasture")!;expect(matchesManagedTask(task,"목장","daily")).toBe(true);expect(matchesManagedTask(task,"목장","weekly")).toBe(false);});});
