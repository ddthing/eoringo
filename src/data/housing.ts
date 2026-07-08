import type { HousingPhaseResult } from "../types";

export type HousingOverride = Partial<HousingPhaseResult>;

export const housingConfig = {
  seedEntryStartDate: "2023-11-04",
  entryDays: 5,
  resultDays: 4,
  timezone: "Asia/Seoul",
  overrides: {} as Record<string, HousingOverride>,
} as const;
