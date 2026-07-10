import { useCharacterStore } from "../character/useCharacterStore";
import { useTaskStore } from "./useTaskStore";

const emptyIds = [] as const;

export const useCurrentDisabledDefaultTaskIds = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  return useTaskStore(
    (state) => state.disabledDefaultTaskIdsByCharacter[activeCharacterId] ?? emptyIds,
  );
};
