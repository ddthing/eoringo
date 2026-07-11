import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CharacterManager } from "../characters/CharacterManager";
import { DataSettingsPanel } from "./BackupRestorePanel";
import { AppInfoPanel, NotificationSettingsPanel } from "./SettingsInfoPanels";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";
import { getSettingsSectionId } from "./sections";

const PageTitle = () => (
  <div className="px-1">
    <p className="muted-label">설정</p>
    <h1 className="text-lg font-bold text-ink">앱 설정</h1>
  </div>
);

export const SettingsPage = () => {
  const location = useLocation();
  const [highlightCharacters, setHighlightCharacters] = useState(false);

  useEffect(() => {
    const sectionId = getSettingsSectionId(location.hash);

    if (!sectionId) {
      return undefined;
    }

    let highlightTimerId: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      section?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });

      if (sectionId === "characters" && !reduceMotion) {
        setHighlightCharacters(true);
        highlightTimerId = window.setTimeout(() => setHighlightCharacters(false), 1_400);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (highlightTimerId !== undefined) {
        window.clearTimeout(highlightTimerId);
      }
      setHighlightCharacters(false);
    };
  }, [location.hash, location.key]);

  return (
    <div className="space-y-3">
      <PageTitle />
      <div
        id="characters"
        className={[
          "scroll-mt-[calc(var(--app-header-height)+0.75rem)] rounded-[18px]",
          highlightCharacters ? "settings-anchor-highlight" : "",
        ].join(" ")}
      >
        <CharacterManager />
      </div>
      <div id="theme" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)]">
        <ThemeSettingsPanel />
      </div>
      <div id="notifications" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)]">
        <NotificationSettingsPanel />
      </div>
      <div id="backup" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)]">
        <DataSettingsPanel />
      </div>
      <div id="about" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)]">
        <AppInfoPanel />
      </div>
    </div>
  );
};
