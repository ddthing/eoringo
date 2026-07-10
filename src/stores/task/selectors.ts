import type { TaskTemplate } from "../../types";

export const selectCustomTasksForCharacter = (
  customTasksByCharacter: Record<string, TaskTemplate[]>,
  characterId: string,
) => customTasksByCharacter[characterId] ?? [];

export const selectCompletedTasksForCharacter = (
  completedByCharacter: Record<string, Record<string, number | boolean>>,
  characterId: string,
) => completedByCharacter[characterId] ?? {};
