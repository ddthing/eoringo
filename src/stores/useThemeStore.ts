import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultThemeColorId, isThemeColorId, type ThemeColorId } from "../data/themes";
import { defaultCustomAccentColor, normalizeHexColor } from "../lib/color";
import { storageKeys } from "../lib/storage";

type PersistedThemeState = Partial<{
  themeColorId: ThemeColorId;
  customAccentColor: string;
}>;

type ThemeState = {
  themeColorId: ThemeColorId;
  customAccentColor: string;
  setThemeColor: (themeColorId: ThemeColorId) => void;
  setCustomAccentColor: (color: string) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeThemeState = (persistedState: unknown): PersistedThemeState => {
  const state = isRecord(persistedState) ? persistedState : {};

  return {
    themeColorId: isThemeColorId(state.themeColorId)
      ? state.themeColorId
      : defaultThemeColorId,
    customAccentColor: normalizeHexColor(state.customAccentColor),
  };
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeColorId: defaultThemeColorId,
      customAccentColor: defaultCustomAccentColor,
      setThemeColor: (themeColorId) => set({ themeColorId }),
      setCustomAccentColor: (color) => set({ customAccentColor: normalizeHexColor(color) }),
    }),
    {
      name: storageKeys.theme,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: normalizeThemeState,
      partialize: (state) => ({
        themeColorId: state.themeColorId,
        customAccentColor: state.customAccentColor,
      }),
    },
  ),
);
