import type { TaskTemplate } from "../../types";

const emptyCompletedAt: Record<string, string> = Object.freeze({});

export const selectCustomTasksForCharacter = (
  customTasksByCharacter: Record<string, TaskTemplate[]>,
  characterId: string,
) => customTasksByCharacter[characterId] ?? [];

export const selectCompletedTasksForCharacter = (
  completedByCharacter: Record<string, Record<string, number | boolean>>,
  characterId: string,
) => completedByCharacter[characterId] ?? {};

export const selectCompletedAtForCharacter = (
  completedAtByCharacter: Record<string, Record<string, string>>,
  characterId: string,
) => completedAtByCharacter[characterId] ?? emptyCompletedAt;
