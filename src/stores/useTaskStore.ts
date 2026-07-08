import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultTaskTemplates } from "../data/tasks";
import { getResetKeys } from "../domain/tasks/resetRules";
import { createId, storageKeys } from "../lib/storage";
import type { ResetType, TaskCategory, TaskGroup, TaskTemplate } from "../types";

type TaskCountValue = number | boolean;
type CompletedByScope = Record<string, Record<string, TaskCountValue>>;

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
  customTaskTemplates: Partial<TaskTemplate>[];
  disabledDefaultTaskIds: string[];
  dailyResetKey: string;
  weeklyResetKey: string;
}>;

type TaskState = {
  completedByCharacter: CompletedByScope;
  customTaskTemplates: TaskTemplate[];
  disabledDefaultTaskIds: string[];
  dailyResetKey: string;
  weeklyResetKey: string;
  ensureCurrentResets: (date?: Date) => void;
  toggleTask: (scopeId: string, taskId: string, maxCount?: number) => void;
  setTaskCount: (scopeId: string, taskId: string, count: number, maxCount?: number) => void;
  setTaskCompleted: (scopeId: string, taskId: string, completed: boolean) => void;
  addCustomTask: (task: CustomTaskInput) => void;
  updateCustomTask: (taskId: string, patch: Partial<CustomTaskInput>) => void;
  removeCustomTask: (taskId: string) => void;
  toggleCustomTaskEnabled: (taskId: string) => void;
  toggleDefaultTaskEnabled: (taskId: string) => void;
};

const resetKeys = getResetKeys();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getTaskCount = (value: TaskCountValue | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  return value === true ? 1 : 0;
};

const getSafeMaxCount = (maxCount = 1) => Math.max(1, Math.floor(Number(maxCount) || 1));

const getResettableTasks = (customTaskTemplates: TaskTemplate[]) => [
  ...defaultTaskTemplates,
  ...customTaskTemplates,
];

const normalizeCustomTask = (task: Partial<TaskTemplate>, index = 0): TaskTemplate => ({
  id: task.id ?? createId("custom-task"),
  title: task.title?.trim() || "이름 없는 숙제",
  description: task.description,
  category: task.category ?? "custom",
  resetType: task.resetType ?? "manual",
  maxCount: getSafeMaxCount(task.maxCount),
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

const clearTasksByResetType = (
  completedByCharacter: CompletedByScope,
  templates: TaskTemplate[],
  resetType: Exclude<ResetType, "manual">,
) => {
  const taskIdSet = new Set(
    templates.filter((task) => task.resetType === resetType).map((task) => task.id),
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

const normalizePersistedTaskState = (persistedState: unknown): PersistedTaskState => {
  const state = isRecord(persistedState) ? persistedState : {};
  const customTaskTemplates = Array.isArray(state.customTaskTemplates)
    ? state.customTaskTemplates.filter(isRecord).map(normalizeCustomTask)
    : [];
  const disabledDefaultTaskIds = Array.isArray(state.disabledDefaultTaskIds)
    ? state.disabledDefaultTaskIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    completedByCharacter: normalizeCompletedByCharacter(state.completedByCharacter),
    customTaskTemplates,
    disabledDefaultTaskIds,
    dailyResetKey:
      typeof state.dailyResetKey === "string" ? state.dailyResetKey : resetKeys.dailyResetKey,
    weeklyResetKey:
      typeof state.weeklyResetKey === "string" ? state.weeklyResetKey : resetKeys.weeklyResetKey,
  };
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      completedByCharacter: {},
      customTaskTemplates: [],
      disabledDefaultTaskIds: [],
      dailyResetKey: resetKeys.dailyResetKey,
      weeklyResetKey: resetKeys.weeklyResetKey,
      ensureCurrentResets: (date = new Date()) =>
        set((state) => {
          const nextKeys = getResetKeys(date);
          const templates = getResettableTasks(state.customTaskTemplates);
          let completedByCharacter = state.completedByCharacter;

          if (state.dailyResetKey !== nextKeys.dailyResetKey) {
            completedByCharacter = clearTasksByResetType(completedByCharacter, templates, "daily");
          }

          if (state.weeklyResetKey !== nextKeys.weeklyResetKey) {
            completedByCharacter = clearTasksByResetType(completedByCharacter, templates, "weekly");
          }

          return {
            completedByCharacter,
            dailyResetKey: nextKeys.dailyResetKey,
            weeklyResetKey: nextKeys.weeklyResetKey,
          };
        }),
      toggleTask: (scopeId, taskId, maxCount = 1) =>
        set((state) => {
          const safeMaxCount = getSafeMaxCount(maxCount);
          const currentScopeState = state.completedByCharacter[scopeId] ?? {};
          const currentCount = getTaskCount(currentScopeState[taskId]);
          const nextCount = currentCount >= safeMaxCount ? 0 : currentCount + 1;
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
          };
        }),
      setTaskCount: (scopeId, taskId, count, maxCount = Number.MAX_SAFE_INTEGER) =>
        set((state) => {
          const currentScopeState = state.completedByCharacter[scopeId] ?? {};
          const nextScopeState = { ...currentScopeState };
          const nextCount = Math.min(getTaskCount(count), getSafeMaxCount(maxCount));

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
          };
        }),
      setTaskCompleted: (scopeId, taskId, completed) =>
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
          };
        }),
      addCustomTask: (task) =>
        set((state) => ({
          customTaskTemplates: [
            ...state.customTaskTemplates,
            createCustomTask(task, 1000 + state.customTaskTemplates.length),
          ],
        })),
      updateCustomTask: (taskId, patch) =>
        set((state) => ({
          customTaskTemplates: state.customTaskTemplates.map((task) =>
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
        })),
      removeCustomTask: (taskId) =>
        set((state) => ({
          customTaskTemplates: state.customTaskTemplates.filter((task) => task.id !== taskId),
          completedByCharacter: removeCompletedTask(state.completedByCharacter, taskId),
        })),
      toggleCustomTaskEnabled: (taskId) =>
        set((state) => ({
          customTaskTemplates: state.customTaskTemplates.map((task) =>
            task.id === taskId ? { ...task, enabledByDefault: !task.enabledByDefault } : task,
          ),
        })),
      toggleDefaultTaskEnabled: (taskId) =>
        set((state) => {
          const disabledSet = new Set(state.disabledDefaultTaskIds);

          if (disabledSet.has(taskId)) {
            disabledSet.delete(taskId);
          } else {
            disabledSet.add(taskId);
          }

          return {
            disabledDefaultTaskIds: Array.from(disabledSet),
            completedByCharacter: disabledSet.has(taskId)
              ? removeCompletedTask(state.completedByCharacter, taskId)
              : state.completedByCharacter,
          };
        }),
    }),
    {
      name: storageKeys.tasks,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: normalizePersistedTaskState,
      partialize: (state) => ({
        completedByCharacter: state.completedByCharacter,
        customTaskTemplates: state.customTaskTemplates,
        disabledDefaultTaskIds: state.disabledDefaultTaskIds,
        dailyResetKey: state.dailyResetKey,
        weeklyResetKey: state.weeklyResetKey,
      }),
    },
  ),
);
