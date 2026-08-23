import { HomeDday } from "./HomeDday";
import { HomeHero } from "./HomeHero";
import { HomeHousingWidget } from "./HomeHousingWidget";
import { HomeMemo } from "./HomeMemo";
import { HomeProgress } from "./HomeProgress";
import { HomePvPWidget } from "./HomePvPWidget";
import { HomeTodayCheck } from "./HomeTodayCheck";
import { HomeDashboardTasksProvider } from "./useHomeDashboardTasks";

export const HomeDashboard = () => (
  <HomeDashboardTasksProvider>
    <div className="home-dashboard grid gap-3 px-0 min-[420px]:gap-3.5 min-[420px]:px-0.5 md:px-2 lg:grid-cols-12 lg:gap-4">
      <header className="home-dashboard-header lg:col-span-12">
        <div className="home-dashboard-header-copy">
          <h1 className="home-dashboard-title">오늘의 루틴</h1>
          <p className="home-dashboard-description">먼저 끝낼 숙제와 중요한 일정을 한눈에 확인하세요.</p>
        </div>
        <div className="home-dashboard-header-note" aria-label="시간 기준">
          <span className="home-dashboard-header-note-dot" aria-hidden />
          <span>KST 기준</span>
        </div>
      </header>
      <div className="home-dashboard-hero min-w-0 lg:col-span-12">
        <HomeHero />
      </div>
      <div className="home-dashboard-columns min-w-0 lg:col-span-12">
        <div className="home-dashboard-column home-dashboard-column-primary min-w-0">
          <div className="home-dashboard-today min-w-0">
            <HomeTodayCheck />
          </div>
          <div className="home-dashboard-memo min-w-0">
            <HomeMemo />
          </div>
        </div>
        <div className="home-dashboard-column home-dashboard-column-secondary min-w-0">
          <div className="home-dashboard-progress min-w-0">
            <HomeProgress />
          </div>
          <div className="home-dashboard-status min-w-0 grid grid-cols-2 items-stretch gap-3 max-[360px]:grid-cols-1 md:gap-3.5 lg:gap-4">
            <HomePvPWidget />
            <HomeHousingWidget />
          </div>
          <div className="home-dashboard-dday min-w-0">
            <HomeDday />
          </div>
        </div>
      </div>
    </div>
  </HomeDashboardTasksProvider>
);
