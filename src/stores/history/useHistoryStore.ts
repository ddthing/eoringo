import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeHistoryState } from "../../domain/history/normalizeHistoryState";
import { storageKeys } from "../../lib/storage";
import type { HistoryDay } from "../../types";

type HistoryState = {
  entriesByDate: Record<string, HistoryDay>;
  saveDay: (day: HistoryDay) => void;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entriesByDate: {},
      saveDay: (day) =>
        set((state) => ({
          entriesByDate: { ...state.entriesByDate, [day.date]: day },
        })),
    }),
    {
      name: storageKeys.history,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: normalizeHistoryState,
      partialize: (state) => ({ entriesByDate: state.entriesByDate }),
    },
  ),
);
