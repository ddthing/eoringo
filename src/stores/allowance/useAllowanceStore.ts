import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getCurrentLeveAccrualKey,
  normalizeLeveAllowanceSnapshot,
  setLeveAllowanceValue,
} from "../../domain/allowances/leveAllowances";
import { storageKeys } from "../../lib/storage";

type AllowanceState = {
  value: number;
  lastAccrualKey: string;
  ensureCurrentAccruals: (date?: Date) => void;
  setValue: (value: number) => void;
};

const initialAccrualKey = getCurrentLeveAccrualKey();

export const useAllowanceStore = create<AllowanceState>()(
  persist(
    (set, get) => ({
      value: 0,
      lastAccrualKey: initialAccrualKey,
      ensureCurrentAccruals: (date = new Date()) => {
        const state = get();
        const nextSnapshot = normalizeLeveAllowanceSnapshot(state, date);

        if (
          nextSnapshot.value === state.value
          && nextSnapshot.lastAccrualKey === state.lastAccrualKey
        ) {
          return;
        }

        set(nextSnapshot);
      },
      setValue: (value) => set({ value: setLeveAllowanceValue(value) }),
    }),
    {
      name: storageKeys.allowances,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (state) => normalizeLeveAllowanceSnapshot(state),
      partialize: (state) => ({ value: state.value, lastAccrualKey: state.lastAccrualKey }),
    },
  ),
);
