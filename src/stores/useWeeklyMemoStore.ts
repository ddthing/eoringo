import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKeys } from "../lib/storage";

type WeeklyMemoState = {
  memo: string;
  setMemo: (memo: string) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const useWeeklyMemoStore = create<WeeklyMemoState>()(
  persist(
    (set) => ({
      memo: "",
      setMemo: (memo) => set({ memo }),
    }),
    {
      name: storageKeys.weeklyMemo,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState) => {
        const state = isRecord(persistedState) ? persistedState : {};

        return {
          memo: typeof state.memo === "string" ? state.memo : "",
        };
      },
      partialize: (state) => ({ memo: state.memo }),
    },
  ),
);
