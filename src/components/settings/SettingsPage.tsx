import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { CharacterManager } from "../characters/CharacterManager";
import { AccountDataPanel } from "./AccountDataPanel";
import { AppInfoPanel, NotificationSettingsPanel } from "./SettingsInfoPanels";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";
import { getSettingsSectionId } from "./sections";
import { SectionHeader } from "../ui";

const PageTitle = () => (
  <SectionHeader
    eyebrow="설정"
    title="앱 설정"
    description="캐릭터와 테마, 계정 데이터를 한곳에서 관리하세요."
    icon={<Settings2 size={18} strokeWidth={2.2} />}
    headingLevel="h1"
    variant="page"
  />
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
    <div className="space-y-4">
      <PageTitle />
      <div
        id="characters"
        className={[
          "scroll-mt-[calc(var(--app-header-height)+0.75rem)] rounded-ui-lg",
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
      <div id="account" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)]">
        <AccountDataPanel />
      </div>
      <div id="about" className="scroll-mt-[calc(var(--app-header-height)+0.75rem)]">
        <AppInfoPanel />
      </div>
    </div>
  );
};
