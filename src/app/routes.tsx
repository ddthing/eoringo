import { createBrowserRouter } from "react-router-dom";
import { CalendarPage } from "../components/calendar/CalendarPage";
import { CharacterSwitcher } from "../components/characters/CharacterSwitcher";
import { CustomTaskList } from "../components/dashboard/CustomTaskList";
import { DailyTaskList } from "../components/dashboard/DailyTaskList";
import { FrontlineWidget } from "../components/dashboard/FrontlineWidget";
import { HousingWidget } from "../components/dashboard/HousingWidget";
import { LockHero } from "../components/dashboard/LockHero";
import { TodayTodoPreview } from "../components/dashboard/TodayTodoPreview";
import { UpcomingAnniversaryWidget } from "../components/dashboard/UpcomingAnniversaryWidget";
import { WeeklyMemoWidget } from "../components/dashboard/WeeklyMemoWidget";
import { WeeklyTaskList } from "../components/dashboard/WeeklyTaskList";
import { BackupRestorePanel } from "../components/settings/BackupRestorePanel";
import { DefaultTaskManager } from "../components/tasks/DefaultTaskManager";
import { TaskOverview } from "../components/tasks/TaskOverview";
import { App } from "./App";

const DashboardPage = () => (
  <div className="space-y-3">
    <LockHero />
    <div className="grid grid-cols-2 gap-2.5 max-[380px]:grid-cols-1">
      <FrontlineWidget />
      <HousingWidget />
    </div>
    <TodayTodoPreview />
    <WeeklyMemoWidget />
    <UpcomingAnniversaryWidget />
  </div>
);

const PageTitle = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="px-1">
    <p className="muted-label">{eyebrow}</p>
    <h1 className="text-lg font-bold text-ink">{title}</h1>
  </div>
);

const TasksPage = () => (
  <div className="space-y-3">
    <PageTitle eyebrow="루틴" title="전체 체크리스트" />
    <TaskOverview />
    <CharacterSwitcher />
    <DailyTaskList />
    <WeeklyTaskList />
    <DefaultTaskManager />
    <CustomTaskList />
  </div>
);

const CharactersPage = () => (
  <div className="space-y-3">
    <PageTitle eyebrow="캐릭터" title="캐릭터 메모" />
    <CharacterSwitcher showManager />
  </div>
);

const SettingsPage = () => (
  <div className="space-y-3">
    <PageTitle eyebrow="설정" title="백업과 데이터" />
    <BackupRestorePanel />
  </div>
);

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "characters", element: <CharactersPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
