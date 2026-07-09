import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultThemeColorId, isThemeColorId, type ThemeColorId } from "../data/themes";
import { storageKeys } from "../lib/storage";

type PersistedThemeState = Partial<{
  themeColorId: ThemeColorId;
}>;

type ThemeState = {
  themeColorId: ThemeColorId;
  setThemeColor: (themeColorId: ThemeColorId) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeThemeState = (persistedState: unknown): PersistedThemeState => {
  const state = isRecord(persistedState) ? persistedState : {};

  return {
    themeColorId: isThemeColorId(state.themeColorId)
      ? state.themeColorId
      : defaultThemeColorId,
  };
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeColorId: defaultThemeColorId,
      setThemeColor: (themeColorId) => set({ themeColorId }),
    }),
    {
      name: storageKeys.theme,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: normalizeThemeState,
      partialize: (state) => ({ themeColorId: state.themeColorId }),
    },
  ),
);
