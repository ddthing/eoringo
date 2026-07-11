import type {
  CharacterHistory,
  DdayEvent,
  HistoryDay,
  HistoryTask,
  TaskCategory,
  TaskGroup,
  TaskProgress,
  ResetType,
} from "../../types";

export type PersistedHistoryState = {
  entriesByDate: Record<string, HistoryDay>;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const taskCategories: TaskCategory[] = ["daily", "weekly", "custom"];
const taskGroups: TaskGroup[] = [
  "roulette", "delivery", "combat", "pvp", "housing", "lifestyle", "event", "custom",
];
const resetTypes: ResetType[] = ["daily", "weekly", "eighteenHours", "manual"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getSafeInteger = (value: unknown, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
};

const normalizeTask = (value: unknown): HistoryTask | null => {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) return null;

  const maxCount = Math.max(1, getSafeInteger(value.maxCount, 1));
  const count = Math.min(getSafeInteger(value.count, 0), maxCount);

  return {
    id: value.id,
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "이름 없는 숙제",
    category: taskCategories.includes(value.category as TaskCategory)
      ? (value.category as TaskCategory)
      : "custom",
    group: taskGroups.includes(value.group as TaskGroup) ? (value.group as TaskGroup) : "custom",
    resetType: resetTypes.includes(value.resetType as ResetType)
      ? (value.resetType as ResetType)
      : "manual",
    maxCount,
    count,
    completed: count >= maxCount,
  };
};

const getProgress = (tasks: HistoryTask[]): TaskProgress => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;

  return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
};

const normalizeDdayEvents = (value: unknown, characterId: string): DdayEvent[] =>
  (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .flatMap((event) => {
      if (
        typeof event.id !== "string" ||
        typeof event.title !== "string" ||
        typeof event.date !== "string" ||
        !dateKeyPattern.test(event.date)
      ) {
        return [];
      }

      return [{ id: event.id, title: event.title, date: event.date, characterId }];
    });

const normalizeCharacterHistory = (
  value: unknown,
  characterId: string,
): CharacterHistory | null => {
  if (!isRecord(value) || !isRecord(value.character)) return null;

  const tasks = (Array.isArray(value.tasks) ? value.tasks : [])
    .map(normalizeTask)
    .filter((task): task is HistoryTask => task !== null);
  const byCategory = (category: TaskCategory) => tasks.filter((task) => task.category === category);

  return {
    character: {
      id: characterId,
      name:
        typeof value.character.name === "string" && value.character.name.trim()
          ? value.character.name.trim()
          : "이름 없는 캐릭터",
      server: typeof value.character.server === "string" ? value.character.server : "",
      isMain: value.character.isMain === true,
    },
    tasks,
    memo: typeof value.memo === "string" ? value.memo : "",
    progress: {
      daily: getProgress(byCategory("daily")),
      weekly: getProgress(byCategory("weekly")),
      other: getProgress(byCategory("custom")),
      total: getProgress(tasks),
    },
    ddayEvents: normalizeDdayEvents(value.ddayEvents, characterId),
  };
};

export const normalizeHistoryState = (persistedState: unknown): PersistedHistoryState => {
  const state = isRecord(persistedState) ? persistedState : {};
  const entries = isRecord(state.entriesByDate) ? state.entriesByDate : {};

  return {
    entriesByDate: Object.fromEntries(
      Object.entries(entries).flatMap(([date, value]) => {
        if (!dateKeyPattern.test(date) || !isRecord(value) || !isRecord(value.characters)) return [];

        const characters = Object.fromEntries(
          Object.entries(value.characters).flatMap(([characterId, characterValue]) => {
            const character = normalizeCharacterHistory(characterValue, characterId);
            return character ? [[characterId, character]] : [];
          }),
        );

        return [[date, {
          date,
          capturedAt:
            typeof value.capturedAt === "string"
              ? value.capturedAt
              : `${date}T00:00:00.000Z`,
          characters,
        } satisfies HistoryDay]];
      }),
    ),
  };
};
