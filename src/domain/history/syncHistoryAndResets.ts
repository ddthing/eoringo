import { buildHistoryDay } from "./buildHistoryDay";
import { getKstDateKey } from "../../lib/date";
import { useCharacterStore } from "../../stores/useCharacterStore";
import { useDdayStore } from "../../stores/useDdayStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { useTaskStore } from "../../stores/useTaskStore";
import { useWeeklyMemoStore } from "../../stores/useWeeklyMemoStore";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export type HistoryRollover = {
  currentDateKey: string;
  previousDateKey: string;
  capturePreviousDay: (dateKey: string) => void;
  ensureCurrentResets: () => void;
};

export const runHistoryRollover = ({
  currentDateKey,
  previousDateKey,
  capturePreviousDay,
  ensureCurrentResets,
}: HistoryRollover) => {
  if (currentDateKey !== previousDateKey && dateKeyPattern.test(previousDateKey)) {
    capturePreviousDay(previousDateKey);
  }

  ensureCurrentResets();
};

export const captureHistoryDay = (dateKey: string, capturedAt = new Date().toISOString()) => {
  const taskState = useTaskStore.getState();

  useHistoryStore.getState().saveDay(
    buildHistoryDay({
      date: dateKey,
      capturedAt,
      characters: useCharacterStore.getState().characters,
      completedByCharacter: taskState.completedByCharacter,
      customTaskTemplatesByCharacter: taskState.customTaskTemplatesByCharacter,
      disabledDefaultTaskIdsByCharacter: taskState.disabledDefaultTaskIdsByCharacter,
      memosByCharacter: useWeeklyMemoStore.getState().memosByCharacter,
      eventsByCharacter: useDdayStore.getState().eventsByCharacter,
    }),
  );
};

export const syncHistoryAndResets = (date = new Date()) => {
  const taskState = useTaskStore.getState();

  runHistoryRollover({
    currentDateKey: getKstDateKey(date),
    previousDateKey: taskState.dailyResetKey,
    capturePreviousDay: (dateKey) => captureHistoryDay(dateKey, date.toISOString()),
    ensureCurrentResets: () => useTaskStore.getState().ensureCurrentResets(date),
  });
};
