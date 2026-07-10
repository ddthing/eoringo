import { createBrowserRouter } from "react-router-dom";
import { CalendarPage } from "../components/calendar/CalendarPage";
import { HomeDashboard } from "../components/home/HomeDashboard";
import { BackupRestorePanel } from "../components/settings/BackupRestorePanel";
import { ThemeSettingsPanel } from "../components/settings/ThemeSettingsPanel";
import { TaskManagerPage } from "../components/tasks/TaskManagerPage";
import { CharacterSwitcher } from "../components/characters/CharacterSwitcher";
import { App } from "./App";

const PageTitle = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="px-1">
    <p className="muted-label">{eyebrow}</p>
    <h1 className="text-lg font-bold text-ink">{title}</h1>
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
    <ThemeSettingsPanel />
    <BackupRestorePanel />
  </div>
);

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomeDashboard /> },
      { path: "tasks", element: <TaskManagerPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "characters", element: <CharactersPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
