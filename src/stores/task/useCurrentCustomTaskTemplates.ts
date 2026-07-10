import { useCharacterStore } from "../character/useCharacterStore";
import { useTaskStore } from "./useTaskStore";

const emptyTasks = [] as const;

export const useCurrentCustomTaskTemplates = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);

  return useTaskStore(
    (state) => state.customTaskTemplatesByCharacter[activeCharacterId] ?? emptyTasks,
  );
};
