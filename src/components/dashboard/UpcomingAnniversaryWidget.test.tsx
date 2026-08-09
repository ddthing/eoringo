import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpcomingAnniversaryWidget } from "./UpcomingAnniversaryWidget";

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

describe("UpcomingAnniversaryWidget", () => {
  beforeEach(() => {
    ddayState.eventsByCharacter["character-a"] = [];
  });

  it("keeps the home widget read-only and links management to the calendar", () => {
    ddayState.eventsByCharacter["character-a"] = [
      { id: "event-a", title: "언약일", date: "2026-08-12" },
    ];

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <UpcomingAnniversaryWidget />
      </MemoryRouter>,
    );

    expect(markup).toContain("다가오는 기념일");
    expect(markup).toContain("언약일");
    expect(markup).toContain('href="/calendar"');
    expect(markup).not.toContain('name="home-anniversary-title"');
    expect(markup).not.toContain("기념일 이름");
  });

  it("keeps the empty state actionable without rendering a duplicate form", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <UpcomingAnniversaryWidget />
      </MemoryRouter>,
    );

    expect(markup).toContain("등록된 기념일이 없습니다");
    expect(markup).toContain("일정에서 관리");
    expect(markup).not.toContain('name="home-anniversary-date"');
  });
});
