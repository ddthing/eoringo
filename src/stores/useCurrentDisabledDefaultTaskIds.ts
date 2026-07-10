import { useMemo } from "react";
import { getDisabledDefaultTaskIdsForCharacter } from "../domain/tasks/disabledDefaultTasks";
import { useCharacterStore } from "./useCharacterStore";
import { useTaskStore } from "./useTaskStore";

export const useCurrentDisabledDefaultTaskIds = () => {
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);
  const disabledDefaultTaskIdsByCharacter = useTaskStore(
    (state) => state.disabledDefaultTaskIdsByCharacter,
  );
  const disabledGlobalDefaultTaskIds = useTaskStore(
    (state) => state.disabledGlobalDefaultTaskIds,
  );

  return useMemo(
    () =>
      getDisabledDefaultTaskIdsForCharacter(
        disabledDefaultTaskIdsByCharacter,
        disabledGlobalDefaultTaskIds,
        activeCharacterId,
      ),
    [activeCharacterId, disabledDefaultTaskIdsByCharacter, disabledGlobalDefaultTaskIds],
  );
};
