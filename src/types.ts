export type Character = {
  id: string;
  name: string;
  server: string;
  isMain: boolean;
  profileImageId?: string;
};

export type FrontlineMap = {
  id: string;
  shortName: string;
  koName: string;
  displayName: string;
};

export type HousingPhase = "entry" | "result";

export type HousingPhaseResult = {
  phase: HousingPhase;
  label: "신청 기간" | "결과 발표 기간";
  day: number;
  totalDays: number;
  cycleStartDate: string;
  entryStartDate: string;
  entryEndDate: string;
  resultStartDate: string;
  resultEndDate: string;
  nextPhaseDate: string;
  nextPhaseLabel: "신청 기간" | "결과 발표 기간";
  note?: string;
};

export type TaskCategory = "daily" | "weekly" | "custom";

export type ResetType = "daily" | "weekly" | "manual";

export type TaskGroup =
  | "roulette"
  | "delivery"
  | "combat"
  | "pvp"
  | "housing"
  | "lifestyle"
  | "event"
  | "custom";

export type TaskTemplate = {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  resetType: ResetType;
  maxCount: number;
  enabledByDefault: boolean;
  characterScoped: boolean;
  group: TaskGroup;
  priority: number;
  icon?: string;
  note?: string;
  isDefault: boolean;
};

export type TaskProgress = {
  total: number;
  completed: number;
  percent: number;
};

export type DdayEvent = {
  id: string;
  title: string;
  date: string;
  characterId?: string;
};
