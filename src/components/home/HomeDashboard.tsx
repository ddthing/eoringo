import { HomeDday } from "./HomeDday";
import { HomeHero } from "./HomeHero";
import { HomeLegalLinks } from "./HomeLegalLinks";
import { HomeHousingWidget } from "./HomeHousingWidget";
import { HomeMemo } from "./HomeMemo";
import { HomeProgress } from "./HomeProgress";
import { HomePvPWidget } from "./HomePvPWidget";
import { HomeTodayCheck } from "./HomeTodayCheck";
import { HomeDashboardTasksProvider } from "./useHomeDashboardTasks";

export const HomeDashboard = () => (
  <HomeDashboardTasksProvider>
    <div className="home-dashboard grid gap-3 px-0 min-[420px]:gap-3.5 min-[420px]:px-0.5 md:px-2 lg:grid-cols-12 lg:gap-4">
      <div className="min-w-0 lg:col-span-12">
        <HomeHero />
      </div>
      <div className="min-w-0 lg:col-span-7">
        <HomeTodayCheck />
      </div>
      <div className="min-w-0 lg:col-span-5 lg:self-start">
        <HomeProgress />
      </div>
      <div className="grid grid-cols-2 items-stretch gap-3 max-[360px]:grid-cols-1 md:gap-3.5 lg:col-span-12 lg:gap-4">
        <HomePvPWidget />
        <HomeHousingWidget />
      </div>
      <div className="min-w-0 lg:col-span-7">
        <HomeMemo />
      </div>
      <div className="min-w-0 lg:col-span-5">
        <HomeDday />
      </div>
      <div className="lg:col-span-12">
        <HomeLegalLinks />
      </div>
    </div>
  </HomeDashboardTasksProvider>
);
