import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKeys } from "../../lib/storage";

type TaskView = "daily" | "weekly";

type TaskUiState = {
  view: TaskView;
  collapsedGroups: Record<string, boolean>;
  orderByGroup: Record<string, string[]>;
  setView: (view: TaskView) => void;
  toggleGroup: (scopeKey: string) => void;
  setGroupOrder: (scopeKey: string, taskIds: string[]) => void;
};

export const reorderTaskIds = (taskIds: string[], sourceId: string, targetId: string) => {
  const sourceIndex = taskIds.indexOf(sourceId);
  const targetIndex = taskIds.indexOf(targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return taskIds;
  }

  const next = [...taskIds];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
};

export const useTaskUiStore = create<TaskUiState>()(
  persist(
    (set) => ({
      view: "daily",
      collapsedGroups: {},
      orderByGroup: {},
      setView: (view) => set({ view }),
      toggleGroup: (scopeKey) =>
        set((state) => ({
          collapsedGroups: {
            ...state.collapsedGroups,
            [scopeKey]: !state.collapsedGroups[scopeKey],
          },
        })),
      setGroupOrder: (scopeKey, taskIds) =>
        set((state) => ({
          orderByGroup: { ...state.orderByGroup, [scopeKey]: taskIds },
        })),
    }),
    {
      name: storageKeys.taskUi,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        view: state.view,
        collapsedGroups: state.collapsedGroups,
        orderByGroup: state.orderByGroup,
      }),
    },
  ),
);
