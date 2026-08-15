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
      <div className="home-dashboard-hero min-w-0 lg:col-span-12 lg:row-start-1">
        <HomeHero />
      </div>
      <div className="home-dashboard-primary min-w-0 grid gap-4 lg:col-span-7 lg:col-start-1">
        <div className="home-dashboard-today min-w-0">
          <HomeTodayCheck />
        </div>
        <div className="home-dashboard-memo min-w-0">
          <HomeMemo />
        </div>
      </div>
      <div className="home-dashboard-secondary min-w-0 grid gap-4 lg:col-span-5 lg:col-start-8">
        <div className="home-dashboard-progress min-w-0">
          <HomeProgress />
        </div>
        <div className="home-dashboard-status grid grid-cols-2 items-stretch gap-3 max-[360px]:grid-cols-1 md:gap-3.5 lg:gap-4">
          <HomePvPWidget />
          <HomeHousingWidget />
        </div>
        <div className="home-dashboard-dday min-w-0">
          <HomeDday />
        </div>
      </div>
      <div className="home-dashboard-legal lg:col-span-12">
        <HomeLegalLinks />
      </div>
    </div>
  </HomeDashboardTasksProvider>
);
