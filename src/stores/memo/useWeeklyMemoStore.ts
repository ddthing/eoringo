import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKeys } from "../../lib/storage";
import { getMigrationCharacterId } from "../character/getMigrationCharacterId";

type WeeklyMemoState = {
  memosByCharacter: Record<string, string>;
  setMemo: (characterId: string, memo: string) => void;
  removeCharacterData: (characterId: string) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeWeeklyMemoState = (persistedState: unknown) => {
  const state = isRecord(persistedState) ? persistedState : {};
  const memosByCharacter = isRecord(state.memosByCharacter)
    ? Object.fromEntries(
        Object.entries(state.memosByCharacter).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};

  if (typeof state.memo === "string" && state.memo.trim()) {
    const characterId = getMigrationCharacterId();
    memosByCharacter[characterId] ??= state.memo;
  }

  return { memosByCharacter };
};

export const useWeeklyMemoStore = create<WeeklyMemoState>()(
  persist(
    (set) => ({
      memosByCharacter: {},
      setMemo: (characterId, memo) =>
        set((state) => ({
          memosByCharacter: { ...state.memosByCharacter, [characterId]: memo },
        })),
      removeCharacterData: (characterId) =>
        set((state) => {
          const memosByCharacter = { ...state.memosByCharacter };
          delete memosByCharacter[characterId];
          return { memosByCharacter };
        }),
    }),
    {
      name: storageKeys.weeklyMemo,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: normalizeWeeklyMemoState,
      partialize: (state) => ({ memosByCharacter: state.memosByCharacter }),
    },
  ),
);
