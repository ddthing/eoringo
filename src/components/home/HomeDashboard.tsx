import { HomeDday } from "./HomeDday";
import { HomeHero } from "./HomeHero";
import { HomeHousingWidget } from "./HomeHousingWidget";
import { HomeMemo } from "./HomeMemo";
import { HomeProgress } from "./HomeProgress";
import { HomePvPWidget } from "./HomePvPWidget";
import { HomeTodayCheck } from "./HomeTodayCheck";

export const HomeDashboard = () => (
  <div className="home-dashboard grid gap-3 px-0 min-[420px]:gap-3.5 min-[420px]:px-0.5 md:px-2">
    <div className="min-w-0">
      <HomeHero />
    </div>
    <div className="grid grid-cols-2 items-stretch gap-3 max-[360px]:grid-cols-1 md:gap-3.5">
      <HomePvPWidget />
      <HomeHousingWidget />
    </div>
    <div className="min-w-0">
      <HomeTodayCheck />
    </div>
    <div className="min-w-0">
      <HomeProgress />
    </div>
    <div className="min-w-0">
      <HomeMemo />
    </div>
    <div className="min-w-0">
      <HomeDday />
    </div>
  </div>
);
