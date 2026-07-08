export const storageKeys = {
  characters: "ff14-daily-board/characters",
  tasks: "ff14-daily-board/tasks",
  dday: "ff14-daily-board/dday",
  weeklyMemo: "ff14-daily-board/weekly-memo",
} as const;

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
