import { defaultTaskTemplates } from "../../data/tasks";
import { globalTaskScopeId } from "./getTaskScopeId";

export type DisabledDefaultTaskIdsByCharacter = Record<string, string[]>;

export const fallbackMigrationCharacterId = "default-character";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeTaskIdList = (value: unknown) =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];

export const normalizeDisabledDefaultTaskIdsByCharacter = (
  value: unknown,
): DisabledDefaultTaskIdsByCharacter => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([characterId, taskIds]) => [characterId, normalizeTaskIdList(taskIds)] as const)
      .filter(([, taskIds]) => taskIds.length > 0),
  );
};

export const getDisabledDefaultTaskIdsForCharacter = (
  disabledDefaultTaskIdsByCharacter: DisabledDefaultTaskIdsByCharacter,
  disabledGlobalDefaultTaskIds: string[],
  characterId: string,
) =>
  Array.from(
    new Set([
      ...normalizeTaskIdList(disabledGlobalDefaultTaskIds),
      ...(disabledDefaultTaskIdsByCharacter[characterId] ?? []),
    ]),
  );

export const migrateLegacyDisabledDefaultTaskIds = (
  legacyTaskIds: unknown,
  characterId = fallbackMigrationCharacterId,
) => {
  const legacyIds = normalizeTaskIdList(legacyTaskIds);
  const defaultTaskById = new Map(defaultTaskTemplates.map((task) => [task.id, task]));
  const disabledDefaultTaskIdsByCharacter: DisabledDefaultTaskIdsByCharacter = {};
  const disabledGlobalDefaultTaskIds: string[] = [];

  legacyIds.forEach((taskId) => {
    const task = defaultTaskById.get(taskId);

    if (task?.characterScoped ?? true) {
      const scopedCharacterId = characterId || fallbackMigrationCharacterId;
      disabledDefaultTaskIdsByCharacter[scopedCharacterId] = [
        ...(disabledDefaultTaskIdsByCharacter[scopedCharacterId] ?? []),
        taskId,
      ];
      return;
    }

    disabledGlobalDefaultTaskIds.push(taskId);
  });

  return {
    disabledDefaultTaskIdsByCharacter,
    disabledGlobalDefaultTaskIds,
  };
};

export const getDefaultTaskDisabledScope = (taskId: string) => {
  const task = defaultTaskTemplates.find((item) => item.id === taskId);

  return task?.characterScoped === false ? globalTaskScopeId : "character";
};
