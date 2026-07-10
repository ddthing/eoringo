import { HomeDday } from "./HomeDday";
import { HomeHero } from "./HomeHero";
import { HomeHousingWidget } from "./HomeHousingWidget";
import { HomeMemo } from "./HomeMemo";
import { HomeProgress } from "./HomeProgress";
import { HomePvPWidget } from "./HomePvPWidget";

export const HomeDashboard = () => (
  <div className="space-y-3.5">
    <HomeHero />
    <div className="grid grid-cols-2 items-stretch gap-3 max-[380px]:grid-cols-1">
      <HomePvPWidget />
      <HomeHousingWidget />
    </div>
    <HomeProgress />
    <HomeMemo />
    <HomeDday />
  </div>
);
