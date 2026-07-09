import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AppShell } from "../components/layout/AppShell";
import { useThemeStore } from "../stores/useThemeStore";
import { useTaskStore } from "../stores/useTaskStore";

export const App = () => {
  const ensureCurrentResets = useTaskStore((state) => state.ensureCurrentResets);
  const themeColorId = useThemeStore((state) => state.themeColorId);

  useEffect(() => {
    ensureCurrentResets();
    const timerId = window.setInterval(() => ensureCurrentResets(), 60_000);

    return () => window.clearInterval(timerId);
  }, [ensureCurrentResets]);

  useEffect(() => {
    document.documentElement.dataset.themeColor = themeColorId;
  }, [themeColorId]);

  return (
    <ConfirmDialogProvider>
      <AppShell>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </AppShell>
    </ConfirmDialogProvider>
  );
};
