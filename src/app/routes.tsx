import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  authCallbackPath,
  charactersSettingsTarget,
  legacyCharactersPath,
} from "./navigation";
import { HomeDashboard } from "../components/home/HomeDashboard";
import { PrivacyNoticePage, TermsNoticePage } from "../components/legal/LegalNoticePages";
import { App } from "./App";

const CharactersCompatibilityRedirect = () => (
  <Navigate to={charactersSettingsTarget} replace />
);

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  { path: "/privacy", element: <PrivacyNoticePage /> },
  { path: "/terms", element: <TermsNoticePage /> },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomeDashboard /> },
      {
        path: "tasks",
        lazy: async () => {
          const { TaskManagerPage } = await import("../components/tasks/TaskManagerPage");
          return { Component: TaskManagerPage };
        },
      },
      {
        path: "tasks/manage",
        lazy: async () => {
          const { TaskManagementPage } = await import("../components/tasks/TaskManagementPage");
          return { Component: TaskManagementPage };
        },
      },
      {
        path: "calendar",
        lazy: async () => {
          const { CalendarPage } = await import("../components/calendar/CalendarPage");
          return { Component: CalendarPage };
        },
      },
      {
        path: authCallbackPath.slice(1),
        lazy: async () => {
          const { AuthCallbackPage } = await import("../components/auth/AuthCallbackPage");
          return { Component: AuthCallbackPage };
        },
      },
      { path: legacyCharactersPath.slice(1), element: <CharactersCompatibilityRedirect /> },
      {
        path: "settings",
        lazy: async () => {
          const { SettingsPage } = await import("../components/settings/SettingsPage");
          return { Component: SettingsPage };
        },
      },
    ],
  },
]);
