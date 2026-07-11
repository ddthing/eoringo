import { createBrowserRouter, Navigate } from "react-router-dom";
import { charactersSettingsTarget, legacyCharactersPath } from "./navigation";
import { CalendarPage } from "../components/calendar/CalendarPage";
import { HomeDashboard } from "../components/home/HomeDashboard";
import { SettingsPage } from "../components/settings/SettingsPage";
import { TaskManagerPage } from "../components/tasks/TaskManagerPage";
import { App } from "./App";

const CharactersCompatibilityRedirect = () => (
  <Navigate to={charactersSettingsTarget} replace />
);

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomeDashboard /> },
      { path: "tasks", element: <TaskManagerPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: legacyCharactersPath.slice(1), element: <CharactersCompatibilityRedirect /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
