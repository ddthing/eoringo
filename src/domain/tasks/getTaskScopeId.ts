import type { TaskTemplate } from "../../types";

export const globalTaskScopeId = "global";

export const getTaskScopeId = (task: TaskTemplate, characterId: string) =>
  task.characterScoped ? characterId : globalTaskScopeId;
