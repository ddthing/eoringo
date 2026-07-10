import { describe, expect, it } from "vitest";
import {
  isLikelyHtmlResponse,
  normalizeHousingListingSize,
  normalizeHousingServer,
  parseCsvRows,
  parseHousingListingsCsv,
} from "./housingListingsParser";

describe("housing listings parser", () => {
  it("parses quoted csv rows without relying on fixed columns", () => {
    expect(parseCsvRows('"톤베리, 중형",라벤더 12구 5번지\n초코보,대형')).toEqual([
      ["톤베리, 중형", "라벤더 12구 5번지"],
      ["초코보", "대형"],
    ]);
  });

  it("normalizes Korean server names", () => {
    expect(normalizeHousingServer("톤베리 중형 라벤더 12구")).toBe("톤베리");
    expect(normalizeHousingServer("알 수 없는 서버")).toBeUndefined();
  });

  it("normalizes medium and large size keywords", () => {
    expect(normalizeHousingListingSize("중형")).toBe("medium");
    expect(normalizeHousingListingSize("M")).toBe("medium");
    expect(normalizeHousingListingSize("Medium")).toBe("medium");
    expect(normalizeHousingListingSize("대형")).toBe("large");
    expect(normalizeHousingListingSize("L")).toBe("large");
    expect(normalizeHousingListingSize("Large")).toBe("large");
    expect(normalizeHousingListingSize("크기 없음")).toBe("unknown");
  });

  it("extracts listings from row text with flexible column counts", () => {
    const parsed = parseHousingListingsCsv(
      [
        "서버,메모",
        "톤베리,중형,라벤더 12구 5번지,개인",
        "초코보 대형 시로가네 3구 30번지",
        "카벙클,,안갯빛 마을,7구,15번지",
      ].join("\n"),
      { now: new Date("2026-07-10T05:20:00.000Z") },
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.updatedAt).toBe("2026-07-10T05:20:00.000Z");
    expect(parsed.listings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          server: "톤베리",
          size: "medium",
          district: "라벤더",
          ward: "12",
          plot: "5",
        }),
        expect.objectContaining({
          server: "초코보",
          size: "large",
          district: "시로가네",
          ward: "3",
          plot: "30",
        }),
      ]),
    );
  });

  it("keeps raw rows and does not throw for empty or sparse csv", () => {
    expect(parseHousingListingsCsv("")).toMatchObject({
      ok: false,
      listings: [],
      rawRows: [],
      rawPreview: [],
    });

    const sparse = parseHousingListingsCsv(",,,,\n메모만 있음,,,\n,,,");
    expect(sparse.ok).toBe(true);
    expect(sparse.listings).toHaveLength(0);
    expect(sparse.rawRows).toEqual([["메모만 있음", "", "", ""]]);
    expect(sparse.rawPreview).toEqual(["메모만 있음"]);
  });

  it("keeps raw text when a row is only partially structured", () => {
    const parsed = parseHousingListingsCsv("펜리르,엠피레움,비고 확인 필요");

    expect(parsed.listings[0]).toMatchObject({
      server: "펜리르",
      district: "엠피레움",
      size: "unknown",
      rawText: "펜리르 엠피레움 비고 확인 필요",
    });
  });

  it("detects html responses and returns fallback instead of throwing", () => {
    expect(isLikelyHtmlResponse("<!doctype html><html>ServiceLogin</html>")).toBe(true);

    expect(parseHousingListingsCsv("<!doctype html><html></html>")).toMatchObject({
      ok: false,
      listings: [],
      rawRows: [],
      rawPreview: [],
    });
  });
});
