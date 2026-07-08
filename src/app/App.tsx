import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AppShell } from "../components/layout/AppShell";
import { useTaskStore } from "../stores/useTaskStore";

export const App = () => {
  const ensureCurrentResets = useTaskStore((state) => state.ensureCurrentResets);

  useEffect(() => {
    ensureCurrentResets();
    const timerId = window.setInterval(() => ensureCurrentResets(), 60_000);

    return () => window.clearInterval(timerId);
  }, [ensureCurrentResets]);

  return (
    <AppShell>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </AppShell>
  );
};
