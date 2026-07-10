export const globalTaskScopeId = "global";

// Phase 1부터 모든 사용자 진행도는 캐릭터 단위로 격리한다.
export const getTaskScopeId = (_task: unknown, characterId: string) => characterId;
