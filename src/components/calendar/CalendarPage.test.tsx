import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getKstDateKey } from "../../lib/date";
import { CalendarPage } from "./CalendarPage";

const characterState = { activeCharacterId: "character-a" };
const ddayState = {
  eventsByCharacter: {
    "character-a": [] as Array<{ id: string; title: string; date: string }>,
  },
};

vi.mock("../../stores/useCharacterStore", () => ({
  useCharacterStore: (selector: (state: typeof characterState) => unknown) => selector(characterState),
}));

vi.mock("../../stores/useDdayStore", () => ({
  useDdayStore: (selector: (state: typeof ddayState) => unknown) => selector(ddayState),
}));

vi.mock("./CalendarAnniversaryManager", () => ({
  CalendarAnniversaryManager: () => <div>기념일 관리</div>,
}));

vi.mock("./HousingListingsMemo", () => ({
  HousingListingsMemo: () => <div>하우징 매물 현황</div>,
}));

describe("CalendarPage", () => {
  beforeEach(() => {
    ddayState.eventsByCharacter["character-a"] = [];
  });

  it("marks an anniversary on its matching calendar date and previews it above the grid", () => {
    const date = getKstDateKey();
    ddayState.eventsByCharacter["character-a"] = [
      { id: "event-a", title: "언약일", date },
    ];

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    expect(markup).toContain("다가오는 기념일");
    expect(markup).toContain("언약일");
    expect(markup).toContain("기념");
    expect(markup).toContain("내 일정");
  });

  it("does not render a personal schedule preview when no events exist", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    expect(markup).not.toContain("다가오는 기념일");
    expect(markup).toContain("기념일 관리");
  });
});
