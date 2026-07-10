import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AppShell } from "../components/layout/AppShell";
import { getSoftAccentColor, hexToRgbString, normalizeHexColor } from "../lib/color";
import { useThemeStore } from "../stores/useThemeStore";
import { useTaskStore } from "../stores/useTaskStore";

export const App = () => {
  const ensureCurrentResets = useTaskStore((state) => state.ensureCurrentResets);
  const themeColorId = useThemeStore((state) => state.themeColorId);
  const customAccentColor = useThemeStore((state) => state.customAccentColor);

  useEffect(() => {
    ensureCurrentResets();
    const timerId = window.setInterval(() => ensureCurrentResets(), 60_000);

    return () => window.clearInterval(timerId);
  }, [ensureCurrentResets]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeColor = themeColorId;

    if (themeColorId === "custom") {
      const accentColor = normalizeHexColor(customAccentColor);
      root.style.setProperty("--color-primary", hexToRgbString(accentColor));
      root.style.setProperty("--color-primary-soft", getSoftAccentColor(accentColor));
      return;
    }

    root.style.removeProperty("--color-primary");
    root.style.removeProperty("--color-primary-soft");
  }, [customAccentColor, themeColorId]);

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
