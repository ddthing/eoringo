import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AppShell } from "../components/layout/AppShell";
import { syncHistoryAndResets } from "../domain/history/syncHistoryAndResets";
import { getSoftAccentColor, hexToRgbString, normalizeHexColor } from "../lib/color";
import { useThemeStore } from "../stores/useThemeStore";

export const App = () => {
  const themeColorId = useThemeStore((state) => state.themeColorId);
  const customAccentColor = useThemeStore((state) => state.customAccentColor);

  useEffect(() => {
    const sync = () => {
      try {
        syncHistoryAndResets();
      } catch (error) {
        console.error("History snapshot could not be saved before reset.", error);
      }
    };

    sync();
    const timerId = window.setInterval(sync, 60_000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeColor = themeColorId;

    if (themeColorId === "custom") {
      const accentColor = normalizeHexColor(customAccentColor);
      root.style.setProperty("--color-accent", hexToRgbString(accentColor));
      root.style.setProperty("--color-accent-soft", getSoftAccentColor(accentColor));
      return;
    }

    root.style.removeProperty("--color-accent");
    root.style.removeProperty("--color-accent-soft");
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
