import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  authCallbackPath,
  charactersSettingsTarget,
  legacyCharactersPath,
} from "./navigation";
import { HomeDashboard } from "../components/home/HomeDashboard";
import { App } from "./App";

const CharactersCompatibilityRedirect = () => (
  <Navigate to={charactersSettingsTarget} replace />
);

const routeFallback = (
  <div className="grid min-h-[40vh] place-items-center px-6 text-sm font-bold text-ink-muted" role="status">
    화면을 불러오는 중…
  </div>
);

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/guide",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { GuideIndexPage } = await import("../components/guides/GuidePages");
      return { Component: GuideIndexPage };
    },
  },
  {
    path: "/guide/routine",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { RoutineGuidePage } = await import("../components/guides/GuidePages");
      return { Component: RoutineGuidePage };
    },
  },
  {
    path: "/guide/getting-started",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { GettingStartedGuidePage } = await import("../components/guides/GuidePages");
      return { Component: GettingStartedGuidePage };
    },
  },
  {
    path: "/guide/calendar",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { CalendarGuidePage } = await import("../components/guides/GuidePages");
      return { Component: CalendarGuidePage };
    },
  },
  {
    path: "/guide/task-catalog",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { TaskCatalogGuidePage } = await import("../components/guides/GuidePages");
      return { Component: TaskCatalogGuidePage };
    },
  },
  {
    path: "/about",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { AboutPage } = await import("../components/guides/GuidePages");
      return { Component: AboutPage };
    },
  },
  {
    path: "/demo",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { DemoPage } = await import("../components/demo/DemoPage");
      return { Component: DemoPage };
    },
  },
  {
    path: "/privacy",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { PrivacyNoticePage } = await import("../components/legal/LegalNoticePages");
      return { Component: PrivacyNoticePage };
    },
  },
  {
    path: "/terms",
    hydrateFallbackElement: routeFallback,
    lazy: async () => {
      const { TermsNoticePage } = await import("../components/legal/LegalNoticePages");
      return { Component: TermsNoticePage };
    },
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomeDashboard /> },
      {
        path: "tasks",
        hydrateFallbackElement: routeFallback,
        lazy: async () => {
          const { TaskManagerPage } = await import("../components/tasks/TaskManagerPage");
          return { Component: TaskManagerPage };
        },
      },
      {
        path: "tasks/manage",
        hydrateFallbackElement: routeFallback,
        lazy: async () => {
          const { TaskManagementPage } = await import("../components/tasks/TaskManagementPage");
          return { Component: TaskManagementPage };
        },
      },
      {
        path: "calendar",
        hydrateFallbackElement: routeFallback,
        lazy: async () => {
          const { CalendarPage } = await import("../components/calendar/CalendarPage");
          return { Component: CalendarPage };
        },
      },
      {
        path: authCallbackPath.slice(1),
        hydrateFallbackElement: routeFallback,
        lazy: async () => {
          const { AuthCallbackPage } = await import("../components/auth/AuthCallbackPage");
          return { Component: AuthCallbackPage };
        },
      },
      { path: legacyCharactersPath.slice(1), element: <CharactersCompatibilityRedirect /> },
      {
        path: "settings",
        hydrateFallbackElement: routeFallback,
        lazy: async () => {
          const { SettingsPage } = await import("../components/settings/SettingsPage");
          return { Component: SettingsPage };
        },
      },
    ],
  },
]);
