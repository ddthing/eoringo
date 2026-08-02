import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  authCallbackPath,
  charactersSettingsTarget,
  legacyCharactersPath,
} from "./navigation";
import { AuthCallbackPage } from "../components/auth/AuthCallbackPage";
import { CalendarPage } from "../components/calendar/CalendarPage";
import { HomeDashboard } from "../components/home/HomeDashboard";
import { SettingsPage } from "../components/settings/SettingsPage";
import { TaskManagerPage } from "../components/tasks/TaskManagerPage";
import { TaskManagementPage } from "../components/tasks/TaskManagementPage";
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
      { path: "tasks/manage", element: <TaskManagementPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: authCallbackPath.slice(1), element: <AuthCallbackPage /> },
      { path: legacyCharactersPath.slice(1), element: <CharactersCompatibilityRedirect /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
