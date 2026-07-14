import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AppShell } from "../components/layout/AppShell";
import { syncHistoryAndResets } from "../domain/history/syncHistoryAndResets";
import {
  getThemeDocumentState,
  resolveAppearance,
} from "../domain/theme/appearance";
import {
  getAccessibleForegroundColor,
  getSoftAccentColor,
  hexToRgbString,
  normalizeHexColor,
} from "../lib/color";
import { useAllowanceStore } from "../stores/useAllowanceStore";
import { useThemeStore } from "../stores/useThemeStore";
import { getRouteErrorBoundaryKey } from "./errorBoundaryReset";

export const App = () => {
  const location = useLocation();
  const themeColorId = useThemeStore((state) => state.themeColorId);
  const customAccentColor = useThemeStore((state) => state.customAccentColor);
  const appearanceMode = useThemeStore((state) => state.appearanceMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const resolvedAppearance = resolveAppearance(appearanceMode, systemPrefersDark);

  useEffect(() => {
    const sync = () => {
      try {
        syncHistoryAndResets();
        useAllowanceStore.getState().ensureCurrentAccruals();
      } catch (error) {
        console.error("History snapshot could not be saved before reset.", error);
      }
    };

    sync();
    const timerId = window.setInterval(sync, 60_000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (appearanceMode !== "system") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [appearanceMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeColor = themeColorId;
    root.dataset.colorMode = resolvedAppearance;
    root.classList.toggle("dark", resolvedAppearance === "dark");

    const documentTheme = getThemeDocumentState(resolvedAppearance);
    root.style.colorScheme = documentTheme.colorScheme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", documentTheme.themeColor);

    if (themeColorId === "custom") {
      const accentColor = normalizeHexColor(customAccentColor);
      root.style.setProperty("--color-accent", hexToRgbString(accentColor));
      root.style.setProperty(
        "--color-accent-soft",
        getSoftAccentColor(accentColor, resolvedAppearance),
      );
      root.style.setProperty(
        "--color-primary-foreground",
        getAccessibleForegroundColor(accentColor),
      );
      root.style.setProperty(
        "--color-accent-ink",
        resolvedAppearance === "dark" ? "238 241 244" : "31 39 48",
      );
      return;
    }

    root.style.removeProperty("--color-accent");
    root.style.removeProperty("--color-accent-soft");
    root.style.removeProperty("--color-primary-foreground");
    root.style.removeProperty("--color-accent-ink");
  }, [customAccentColor, resolvedAppearance, themeColorId]);

  return (
    <ConfirmDialogProvider>
      <AppShell>
        <ErrorBoundary key={getRouteErrorBoundaryKey(location.pathname)}>
          <Outlet />
        </ErrorBoundary>
      </AppShell>
    </ConfirmDialogProvider>
  );
};
