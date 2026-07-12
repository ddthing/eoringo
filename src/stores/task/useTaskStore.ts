import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultTaskTemplates } from "../../data/tasks";
import {
  migrateLegacyDisabledDefaultTaskIds,
  normalizeDisabledDefaultTaskIdsByCharacter,
  type DisabledDefaultTaskIdsByCharacter,
} from "../../domain/tasks/disabledDefaultTasks";
import {
  getClampedTaskCount,
  getNextTaskCount,
  getSafeTaskMaxCount,
  getTaskCount,
} from "../../domain/tasks/getTaskProgress";
import {
  getCurrentFixedResetKeys,
  getLegacyResetRuleId,
  getResetKeys,
  isIntervalResetExpired,
  isResetRuleId,
  resetRuleRegistry,
} from "../../domain/tasks/resetRules";
import { createId, storageKeys } from "../../lib/storage";
import type { ResetRuleId, ResetType, TaskCategory, TaskGroup, TaskTemplate } from "../../types";
import {
  fallbackMigrationCharacterId,
  getMigrationCharacterId,
} from "../character/getMigrationCharacterId";

type TaskCountValue = number | boolean;
type CompletedByScope = Record<string, Record<string, TaskCountValue>>;
type CompletedAtByScope = Record<string, Record<string, string>>;

export type CustomTaskInput = {
  title: string;
  description?: string;
  category: TaskCategory;
  resetType: ResetType;
  maxCount: number;
  characterScoped: boolean;
  group: TaskGroup;
  note?: string;
  enabledByDefault: boolean;
};

type PersistedTaskState = Partial<{
  completedByCharacter: CompletedByScope;
  completedAtByCharacter: CompletedAtByScope;
  customTaskTemplates: Partial<TaskTemplate>[];
  customTaskTemplatesByCharacter: Record<string, Partial<TaskTemplate>[]>;
  disabledDefaultTaskIds: string[];
  disabledDefaultTaskIdsByCharacter: DisabledDefaultTaskIdsByCharacter;
  disabledGlobalDefaultTaskIds: string[];
  dailyResetKey: string;
  weeklyResetKey: string;
  resetKeysByRule: Partial<Record<ResetRuleId, string>>;
}>;

type TaskState = {
  completedByCharacter: CompletedByScope;
  completedAtByCharacter: CompletedAtByScope;
  customTaskTemplatesByCharacter: Record<string, TaskTemplate[]>;
  disabledDefaultTaskIdsByCharacter: DisabledDefaultTaskIdsByCharacter;
  dailyResetKey: string;
  weeklyResetKey: string;
  resetKeysByRule: Partial<Record<ResetRuleId, string>>;
  ensureCurrentResets: (date?: Date) => void;
  toggleTask: (scopeId: string, taskId: string, maxCount?: number, resetRule?: ResetType | ResetRuleId) => void;
  setTaskCount: (
    scopeId: string,
    taskId: string,
    count: number,
    maxCount?: number,
    resetRule?: ResetType | ResetRuleId,
  ) => void;
  setTaskCompleted: (
    scopeId: string,
    taskId: string,
    completed: boolean,
    resetRule?: ResetType | ResetRuleId,
  ) => void;
  addCustomTask: (characterId: string, task: CustomTaskInput) => void;
  updateCustomTask: (characterId: string, taskId: string, patch: Partial<CustomTaskInput>) => void;
  removeCustomTask: (characterId: string, taskId: string) => void;
  toggleCustomTaskEnabled: (characterId: string, taskId: string) => void;
  toggleDefaultTaskEnabled: (taskId: string, characterId: string) => void;
  removeCharacterData: (characterId: string) => void;
};

const resetKeys = getResetKeys();
const initialFixedResetKeys = getCurrentFixedResetKeys();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resetTypes: ResetType[] = ["daily", "weekly", "eighteenHours", "manual"];

const normalizeResetType = (resetType: unknown): ResetType =>
  resetTypes.includes(resetType as ResetType) ? (resetType as ResetType) : "manual";

const normalizeResetRuleReference = (value: ResetType | ResetRuleId | undefined): ResetRuleId =>
  isResetRuleId(value) ? value : getLegacyResetRuleId(value as ResetType | undefined);

const getResettableTasks = (customTasksByCharacter: Record<string, TaskTemplate[]>) => [
  ...defaultTaskTemplates,
  ...Object.values(customTasksByCharacter).flat(),
];

const normalizeCustomTask = (task: Partial<TaskTemplate>, index = 0): TaskTemplate => ({
  id: task.id ?? createId("custom-task"),
  title: task.title?.trim() || "이름 없는 숙제",
  description: task.description,
  category: task.category ?? "custom",
  resetType: normalizeResetType(task.resetType),
  resetRuleId: isResetRuleId(task.resetRuleId)
    ? task.resetRuleId
    : getLegacyResetRuleId(normalizeResetType(task.resetType)),
  availabilityRuleId: isResetRuleId(task.availabilityRuleId)
    ? task.availabilityRuleId
    : undefined,
  retentionDays:
    typeof task.retentionDays === "number" && Number.isFinite(task.retentionDays) && task.retentionDays > 0
      ? Math.floor(task.retentionDays)
      : undefined,
  maxCount: getSafeTaskMaxCount(task.maxCount),
  enabledByDefault: task.enabledByDefault ?? true,
  characterScoped: task.characterScoped ?? true,
  group: task.group ?? "custom",
  priority: task.priority ?? 1000 + index,
  icon: task.icon,
  note: task.note,
  isDefault: false,
});

const createCustomTask = (task: CustomTaskInput, priority: number): TaskTemplate =>
  normalizeCustomTask({
    ...task,
    id: createId("custom-task"),
    priority,
    isDefault: false,
  });

const clearTasksByResetRuleId = (
  completedByCharacter: CompletedByScope,
  templates: TaskTemplate[],
  resetRuleId: ResetRuleId,
) => {
  const taskIdSet = new Set(
    templates.filter((task) => task.resetRuleId === resetRuleId).map((task) => task.id),
  );

  return Object.fromEntries(
    Object.entries(completedByCharacter).map(([scopeId, taskState]) => [
      scopeId,
      Object.fromEntries(Object.entries(taskState).filter(([taskId]) => !taskIdSet.has(taskId))),
    ]),
  );
};

const removeCompletedTask = (completedByCharacter: CompletedByScope, taskId: string) =>
  Object.fromEntries(
    Object.entries(completedByCharacter).map(([scopeId, taskState]) => {
      const nextTaskState = { ...taskState };
      delete nextTaskState[taskId];

      return [scopeId, nextTaskState];
    }),
  );

const removeCompletedAtTask = (completedAtByCharacter: CompletedAtByScope, taskId: string) =>
  Object.fromEntries(
    Object.entries(completedAtByCharacter).map(([scopeId, taskState]) => {
      const nextTaskState = { ...taskState };
      delete nextTaskState[taskId];

      return [scopeId, nextTaskState];
    }),
  );

const removeCompletedTaskFromScope = (
  completedByCharacter: CompletedByScope,
  scopeId: string,
  taskId: string,
) => {
  const nextScopeState = { ...(completedByCharacter[scopeId] ?? {}) };
  delete nextScopeState[taskId];

  return {
    ...completedByCharacter,
    [scopeId]: nextScopeState,
  };
};

const removeCompletedAtTaskFromScope = (
  completedAtByCharacter: CompletedAtByScope,
  scopeId: string,
  taskId: string,
) => {
  const nextScopeState = { ...(completedAtByCharacter[scopeId] ?? {}) };
  delete nextScopeState[taskId];

  return {
    ...completedAtByCharacter,
    [scopeId]: nextScopeState,
  };
};

const updateCompletedAt = (
  completedAtByCharacter: CompletedAtByScope,
  scopeId: string,
  taskId: string,
  count: number,
  resetRule: ResetType | ResetRuleId = "manual",
) => {
  const resetRuleId = normalizeResetRuleReference(resetRule);
  if (resetRuleRegistry[resetRuleId].kind !== "interval") {
    return completedAtByCharacter;
  }

  const currentScopeState = completedAtByCharacter[scopeId] ?? {};
  const nextScopeState = { ...currentScopeState };

  if (count <= 0) {
    delete nextScopeState[taskId];
  } else if (!nextScopeState[taskId]) {
    nextScopeState[taskId] = new Date().toISOString();
  }

  return {
    ...completedAtByCharacter,
    [scopeId]: nextScopeState,
  };
};

const clearExpiredEighteenHourTasks = (
  completedByCharacter: CompletedByScope,
  completedAtByCharacter: CompletedAtByScope,
  templates: TaskTemplate[],
  date: Date,
) => {
  const taskIdSet = new Set(
    templates.filter((task) => task.resetRuleId === "interval-18h").map((task) => task.id),
  );
  let nextCompletedByCharacter = completedByCharacter;
  let nextCompletedAtByCharacter = completedAtByCharacter;

  Object.entries(completedByCharacter).forEach(([scopeId, taskState]) => {
    Object.keys(taskState).forEach((taskId) => {
      if (
        taskIdSet.has(taskId) &&
        isIntervalResetExpired(completedAtByCharacter[scopeId]?.[taskId], 18, date)
      ) {
        nextCompletedByCharacter = removeCompletedTaskFromScope(
          nextCompletedByCharacter,
          scopeId,
          taskId,
        );
        nextCompletedAtByCharacter = removeCompletedAtTaskFromScope(
          nextCompletedAtByCharacter,
          scopeId,
          taskId,
        );
      }
    });
  });

  return {
    completedByCharacter: nextCompletedByCharacter,
    completedAtByCharacter: nextCompletedAtByCharacter,
  };
};

const normalizeCompletedByCharacter = (completedByCharacter: unknown): CompletedByScope => {
  if (!isRecord(completedByCharacter)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(completedByCharacter)
      .filter(([, taskState]) => isRecord(taskState))
      .map(([scopeId, taskState]) => [
        scopeId,
        Object.fromEntries(
          Object.entries(taskState as Record<string, unknown>)
            .map(([taskId, value]): [string, number] => [
              taskId,
              getTaskCount(value as TaskCountValue),
            ])
            .filter(([, count]) => count > 0),
        ),
      ]),
  );
};

const normalizeCompletedAtByCharacter = (
  completedAtByCharacter: unknown,
): CompletedAtByScope => {
  if (!isRecord(completedAtByCharacter)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(completedAtByCharacter)
      .filter(([, taskState]) => isRecord(taskState))
      .map(([scopeId, taskState]) => [
        scopeId,
        Object.fromEntries(
          Object.entries(taskState as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      ]),
  );
};

const mergeDisabledDefaultTaskIdsByCharacter = (
  first: DisabledDefaultTaskIdsByCharacter,
  second: DisabledDefaultTaskIdsByCharacter,
) => {
  const characterIds = new Set([...Object.keys(first), ...Object.keys(second)]);

  return Object.fromEntries(
    Array.from(characterIds).map((characterId) => [
      characterId,
      Array.from(new Set([...(first[characterId] ?? []), ...(second[characterId] ?? [])])),
    ]),
  );
};

const splitTaskIds = {
  "daily-island": ["daily-island-pasture", "weekly-island-workshop"],
  "weekly-island": ["weekly-island-workshop"],
  "grand-company-squadron-weekly": [
    "grand-company-squadron-routine",
    "grand-company-squadron-priority",
  ],
} as const;

const migrateSplitTaskValues = <T>(
  valuesByScope: Record<string, Record<string, T>>,
  fallbackForNewId?: (oldId: string, newId: string) => T | undefined,
) =>
  Object.fromEntries(
    Object.entries(valuesByScope).map(([scopeId, values]) => {
      const nextValues = { ...values };
      Object.entries(splitTaskIds).forEach(([oldId, newIds]) => {
        const oldValue = values[oldId];
        newIds.forEach((newId) => {
          const value = oldValue ?? fallbackForNewId?.(oldId, newId);
          if (value !== undefined && nextValues[newId] === undefined) nextValues[newId] = value;
        });
        delete nextValues[oldId];
      });
      return [scopeId, nextValues];
    }),
  );

const migrateSplitDisabledIds = (
  disabledByCharacter: DisabledDefaultTaskIdsByCharacter,
): DisabledDefaultTaskIdsByCharacter =>
  Object.fromEntries(
    Object.entries(disabledByCharacter).map(([characterId, ids]) => {
      const nextIds = new Set(ids);
      Object.entries(splitTaskIds).forEach(([oldId, newIds]) => {
        if (!nextIds.has(oldId)) return;
        nextIds.delete(oldId);
        newIds.forEach((newId) => nextIds.add(newId));
      });
      return [characterId, Array.from(nextIds)];
    }),
  );

export const normalizePersistedTaskState = (
  persistedState: unknown,
  _persistedVersion?: number,
  migrationDate: Date = new Date(),
): PersistedTaskState => {
  const state = isRecord(persistedState) ? persistedState : {};
  const migrationCharacterId = getMigrationCharacterId();
  const legacyCustomTaskTemplates = Array.isArray(state.customTaskTemplates)
    ? state.customTaskTemplates.filter(isRecord).map(normalizeCustomTask)
    : [];
  const persistedCustomTasks = isRecord(state.customTaskTemplatesByCharacter)
    ? Object.fromEntries(
        Object.entries(state.customTaskTemplatesByCharacter).map(([characterId, tasks]) => [
          characterId,
          Array.isArray(tasks) ? tasks.filter(isRecord).map(normalizeCustomTask) : [],
        ]),
      )
    : {};
  const customTaskTemplatesByCharacter = {
    ...persistedCustomTasks,
    ...(legacyCustomTaskTemplates.length > 0
      ? {
          [migrationCharacterId]: [
            ...(persistedCustomTasks[migrationCharacterId] ?? []),
            ...legacyCustomTaskTemplates,
          ],
        }
      : {}),
  };
  const legacyDisabledDefaultTaskIds = migrateLegacyDisabledDefaultTaskIds(
    state.disabledDefaultTaskIds,
    migrationCharacterId,
  );
  const disabledDefaultTaskIdsByCharacter = mergeDisabledDefaultTaskIdsByCharacter(
    legacyDisabledDefaultTaskIds.disabledDefaultTaskIdsByCharacter,
    normalizeDisabledDefaultTaskIdsByCharacter(state.disabledDefaultTaskIdsByCharacter),
  );
  const disabledGlobalDefaultTaskIds = Array.from(
    new Set([
      ...legacyDisabledDefaultTaskIds.disabledGlobalDefaultTaskIds,
      ...(Array.isArray(state.disabledGlobalDefaultTaskIds)
        ? state.disabledGlobalDefaultTaskIds.filter((id): id is string => typeof id === "string")
        : []),
    ]),
  );
  const allDisabledByCharacter = migrateSplitDisabledIds(mergeDisabledDefaultTaskIdsByCharacter(
    disabledDefaultTaskIdsByCharacter,
    disabledGlobalDefaultTaskIds.length > 0
      ? { [migrationCharacterId]: disabledGlobalDefaultTaskIds }
      : {},
  ));
  const completedByCharacter = migrateSplitTaskValues(
    normalizeCompletedByCharacter(state.completedByCharacter),
  );
  const completedAtByCharacter = migrateSplitTaskValues(
    normalizeCompletedAtByCharacter(state.completedAtByCharacter),
  );
  Object.entries(completedByCharacter).forEach(([scopeId, completed]) => {
    if (
      completed["grand-company-squadron-routine"] !== undefined &&
      completedAtByCharacter[scopeId]?.["grand-company-squadron-routine"] === undefined
    ) {
      completedAtByCharacter[scopeId] = {
        ...(completedAtByCharacter[scopeId] ?? {}),
        "grand-company-squadron-routine": migrationDate.toISOString(),
      };
    }
  });
  const legacyGlobalCompleted = completedByCharacter.global ?? {};
  const legacyGlobalCompletedAt = completedAtByCharacter.global ?? {};
  delete completedByCharacter.global;
  delete completedAtByCharacter.global;

  if (Object.keys(legacyGlobalCompleted).length > 0) {
    completedByCharacter[migrationCharacterId] = {
      ...legacyGlobalCompleted,
      ...(completedByCharacter[migrationCharacterId] ?? {}),
    };
  }
  if (Object.keys(legacyGlobalCompletedAt).length > 0) {
    completedAtByCharacter[migrationCharacterId] = {
      ...legacyGlobalCompletedAt,
      ...(completedAtByCharacter[migrationCharacterId] ?? {}),
    };
  }

  return {
    completedByCharacter,
    completedAtByCharacter,
    customTaskTemplatesByCharacter,
    disabledDefaultTaskIdsByCharacter: allDisabledByCharacter,
    dailyResetKey:
      typeof state.dailyResetKey === "string" ? state.dailyResetKey : resetKeys.dailyResetKey,
    weeklyResetKey:
      typeof state.weeklyResetKey === "string" ? state.weeklyResetKey : resetKeys.weeklyResetKey,
    resetKeysByRule: getCurrentFixedResetKeys(migrationDate),
  };
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      completedByCharacter: {},
      completedAtByCharacter: {},
      customTaskTemplatesByCharacter: {},
      disabledDefaultTaskIdsByCharacter: {},
      dailyResetKey: resetKeys.dailyResetKey,
      weeklyResetKey: resetKeys.weeklyResetKey,
      resetKeysByRule: initialFixedResetKeys,
      ensureCurrentResets: (date = new Date()) =>
        set((state) => {
          const nextKeys = getResetKeys(date);
          const nextFixedResetKeys = getCurrentFixedResetKeys(date);
          const templates = getResettableTasks(state.customTaskTemplatesByCharacter);
          let completedByCharacter = state.completedByCharacter;
          let completedAtByCharacter = state.completedAtByCharacter;

          Object.entries(nextFixedResetKeys).forEach(([ruleId, nextKey]) => {
            const previousKey = state.resetKeysByRule[ruleId as ResetRuleId];
            if (previousKey !== undefined && previousKey !== nextKey) {
              completedByCharacter = clearTasksByResetRuleId(
                completedByCharacter,
                templates,
                ruleId as ResetRuleId,
              );
            }
          });

          const clearedIntervalTasks = clearExpiredEighteenHourTasks(
            completedByCharacter,
            completedAtByCharacter,
            templates,
            date,
          );
          completedByCharacter = clearedIntervalTasks.completedByCharacter;
          completedAtByCharacter = clearedIntervalTasks.completedAtByCharacter;

          return {
            completedByCharacter,
            completedAtByCharacter,
            dailyResetKey: nextKeys.dailyResetKey,
            weeklyResetKey: nextKeys.weeklyResetKey,
            resetKeysByRule: nextFixedResetKeys,
          };
        }),
      toggleTask: (scopeId, taskId, maxCount = 1, resetType = "manual") =>
        set((state) => {
          const currentScopeState = state.completedByCharacter[scopeId] ?? {};
          const nextCount = getNextTaskCount(currentScopeState[taskId], maxCount);
          const nextScopeState = { ...currentScopeState };

          if (nextCount <= 0) {
            delete nextScopeState[taskId];
          } else {
            nextScopeState[taskId] = nextCount;
          }

          return {
            completedByCharacter: {
              ...state.completedByCharacter,
              [scopeId]: nextScopeState,
            },
            completedAtByCharacter: updateCompletedAt(
              state.completedAtByCharacter,
              scopeId,
              taskId,
              nextCount,
              resetType,
            ),
          };
        }),
      setTaskCount: (
        scopeId,
        taskId,
        count,
        maxCount = Number.MAX_SAFE_INTEGER,
        resetType = "manual",
      ) =>
        set((state) => {
          const currentScopeState = state.completedByCharacter[scopeId] ?? {};
          const nextScopeState = { ...currentScopeState };
          const nextCount = getClampedTaskCount(count, maxCount);

          if (nextCount <= 0) {
            delete nextScopeState[taskId];
          } else {
            nextScopeState[taskId] = nextCount;
          }

          return {
            completedByCharacter: {
              ...state.completedByCharacter,
              [scopeId]: nextScopeState,
            },
            completedAtByCharacter: updateCompletedAt(
              state.completedAtByCharacter,
              scopeId,
              taskId,
              nextCount,
              resetType,
            ),
          };
        }),
      setTaskCompleted: (scopeId, taskId, completed, resetType = "manual") =>
        set((state) => {
          const currentScopeState = state.completedByCharacter[scopeId] ?? {};
          const nextScopeState = { ...currentScopeState };

          if (completed) {
            nextScopeState[taskId] = 1;
          } else {
            delete nextScopeState[taskId];
          }

          return {
            completedByCharacter: {
              ...state.completedByCharacter,
              [scopeId]: nextScopeState,
            },
            completedAtByCharacter: updateCompletedAt(
              state.completedAtByCharacter,
              scopeId,
              taskId,
              completed ? 1 : 0,
              resetType,
            ),
          };
        }),
      addCustomTask: (characterId, task) =>
        set((state) => {
          const tasks = state.customTaskTemplatesByCharacter[characterId] ?? [];
          return { customTaskTemplatesByCharacter: {
            ...state.customTaskTemplatesByCharacter,
            [characterId]: [...tasks, createCustomTask(task, 1000 + tasks.length)],
          }};
        }),
      updateCustomTask: (characterId, taskId, patch) =>
        set((state) => ({
          customTaskTemplatesByCharacter: {
            ...state.customTaskTemplatesByCharacter,
            [characterId]: (state.customTaskTemplatesByCharacter[characterId] ?? []).map((task) =>
            task.id === taskId
              ? normalizeCustomTask({
                  ...task,
                  ...patch,
                  id: task.id,
                  priority: task.priority,
                  isDefault: false,
                })
              : task,
          ),
          },
        })),
      removeCustomTask: (characterId, taskId) =>
        set((state) => ({
          customTaskTemplatesByCharacter: {
            ...state.customTaskTemplatesByCharacter,
            [characterId]: (state.customTaskTemplatesByCharacter[characterId] ?? []).filter((task) => task.id !== taskId),
          },
          completedByCharacter: removeCompletedTaskFromScope(state.completedByCharacter, characterId, taskId),
          completedAtByCharacter: removeCompletedAtTaskFromScope(state.completedAtByCharacter, characterId, taskId),
        })),
      toggleCustomTaskEnabled: (characterId, taskId) =>
        set((state) => ({
          customTaskTemplatesByCharacter: {
            ...state.customTaskTemplatesByCharacter,
            [characterId]: (state.customTaskTemplatesByCharacter[characterId] ?? []).map((task) =>
            task.id === taskId ? { ...task, enabledByDefault: !task.enabledByDefault } : task,
          ),
          },
        })),
      toggleDefaultTaskEnabled: (taskId, characterId) =>
        set((state) => {
          const normalizedCharacterId = characterId || fallbackMigrationCharacterId;
          const disabledCharacterSet = new Set(
            state.disabledDefaultTaskIdsByCharacter[normalizedCharacterId] ?? [],
          );
          const isDisabled = disabledCharacterSet.has(taskId);

          if (isDisabled) {
            disabledCharacterSet.delete(taskId);
          } else {
            disabledCharacterSet.add(taskId);
          }

          const nextDisabledDefaultTaskIdsByCharacter = {
            ...state.disabledDefaultTaskIdsByCharacter,
            [normalizedCharacterId]: Array.from(disabledCharacterSet),
          };
          const completedScopeId = normalizedCharacterId;

          return {
            disabledDefaultTaskIdsByCharacter: nextDisabledDefaultTaskIdsByCharacter,
            completedByCharacter: !isDisabled
              ? removeCompletedTaskFromScope(state.completedByCharacter, completedScopeId, taskId)
              : state.completedByCharacter,
            completedAtByCharacter: !isDisabled
              ? removeCompletedAtTaskFromScope(
                  state.completedAtByCharacter,
                  completedScopeId,
                  taskId,
                )
              : state.completedAtByCharacter,
          };
        }),
      removeCharacterData: (characterId) =>
        set((state) => {
          const completedByCharacter = { ...state.completedByCharacter };
          const completedAtByCharacter = { ...state.completedAtByCharacter };
          const customTaskTemplatesByCharacter = { ...state.customTaskTemplatesByCharacter };
          const disabledDefaultTaskIdsByCharacter = { ...state.disabledDefaultTaskIdsByCharacter };
          delete completedByCharacter[characterId];
          delete completedAtByCharacter[characterId];
          delete customTaskTemplatesByCharacter[characterId];
          delete disabledDefaultTaskIdsByCharacter[characterId];
          return {
            completedByCharacter,
            completedAtByCharacter,
            customTaskTemplatesByCharacter,
            disabledDefaultTaskIdsByCharacter,
          };
        }),
    }),
    {
      name: storageKeys.tasks,
      storage: createJSONStorage(() => localStorage),
      version: 6,
      migrate: normalizePersistedTaskState,
      partialize: (state) => ({
        completedByCharacter: state.completedByCharacter,
        completedAtByCharacter: state.completedAtByCharacter,
        customTaskTemplatesByCharacter: state.customTaskTemplatesByCharacter,
        disabledDefaultTaskIdsByCharacter: state.disabledDefaultTaskIdsByCharacter,
        dailyResetKey: state.dailyResetKey,
        weeklyResetKey: state.weeklyResetKey,
        resetKeysByRule: state.resetKeysByRule,
      }),
    },
  ),
);
