import { differenceInCalendarDays, parseISO } from "date-fns";
import { frontlineMaps, frontlineRotation } from "../../data/frontline";
import { getKstDateKey } from "../../lib/date";
import type { FrontlineMap } from "../../types";

const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

export const getFrontlineByDateKey = (dateKey: string): FrontlineMap => {
  const overrideMapId = frontlineRotation.overrides[dateKey];
  const seedIndex = frontlineMaps.findIndex((map) => map.id === frontlineRotation.seedMapId);
  const fallbackSeedIndex = seedIndex >= 0 ? seedIndex : 0;

  if (overrideMapId) {
    return frontlineMaps.find((map) => map.id === overrideMapId) ?? frontlineMaps[fallbackSeedIndex];
  }

  const daysSinceSeed = differenceInCalendarDays(
    parseISO(dateKey),
    parseISO(frontlineRotation.seedDate),
  );
  const patternMapId =
    frontlineRotation.pattern[positiveModulo(daysSinceSeed, frontlineRotation.pattern.length)];

  return frontlineMaps.find((map) => map.id === patternMapId) ?? frontlineMaps[fallbackSeedIndex];
};

export const getTodayFrontline = (date: Date = new Date()): FrontlineMap =>
  getFrontlineByDateKey(getKstDateKey(date));
