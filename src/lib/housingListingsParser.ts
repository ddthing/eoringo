export const housingListingsSheetUrl =
  "https://docs.google.com/spreadsheets/d/1RGvXw8fIwbY0F9xxZo-59cdtnJd80rWva5Z2ZYruEHY/edit?gid=1152564326#gid=1152564326";

export const housingListingsCsvUrl =
  "https://docs.google.com/spreadsheets/d/1RGvXw8fIwbY0F9xxZo-59cdtnJd80rWva5Z2ZYruEHY/export?format=csv&gid=1152564326";

export const housingListingsGvizCsvUrl =
  "https://docs.google.com/spreadsheets/d/1RGvXw8fIwbY0F9xxZo-59cdtnJd80rWva5Z2ZYruEHY/gviz/tq?tqx=out:csv&gid=1152564326";

export const koreanHousingServers = ["모그리", "초코보", "카벙클", "톤베리", "펜리르"] as const;

export type HousingListingSize = "medium" | "large" | "unknown";

export type HousingListing = {
  id: string;
  server?: string;
  size?: HousingListingSize;
  district?: string;
  ward?: string;
  plot?: string;
  address?: string;
  note?: string;
  rawText: string;
  rawCells: string[];
};

export type HousingListingsResponse = {
  ok: boolean;
  listings: HousingListing[];
  rawRows: string[][];
  rawPreview: string[];
  updatedAt: string;
  sourceUrl: string;
  message?: string;
};

type ParseOptions = {
  now?: Date;
  sourceUrl?: string;
};

const housingDistricts = [
  "라벤더",
  "라벤더 안식처",
  "안갯빛",
  "안갯빛 마을",
  "하늘잔",
  "하늘잔 마루",
  "고블렛",
  "고블렛 뷰트",
  "시로가네",
  "엠피레움",
];

const normalizeCell = (value: string) => value.replace(/\s+/g, " ").trim();

export const isLikelyHtmlResponse = (value: string) => {
  const sample = value.slice(0, 1000).toLowerCase();

  return (
    sample.includes("<!doctype") ||
    sample.includes("<html") ||
    sample.includes("accounts.google.com") ||
    sample.includes("servicelogin")
  );
};

const createListingId = (rowIndex: number, rawText: string) => {
  let hash = 0;

  for (const character of rawText) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `housing-listing-${rowIndex}-${hash.toString(36)}`;
};

export const parseCsvRows = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(normalizeCell(cell));
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(normalizeCell(cell));
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(normalizeCell(cell));
  rows.push(row);

  return rows.filter((csvRow) => csvRow.some((value) => value.length > 0));
};

export const createRawPreview = (rawRows: string[][], limit = 15) =>
  rawRows
    .map((row) => row.filter(Boolean).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, limit);

export const normalizeHousingServer = (value: string) =>
  koreanHousingServers.find((server) => value.includes(server));

export const normalizeHousingListingSize = (value: string): HousingListingSize => {
  if (/중형/i.test(value) || /\b(m|medium)\b/i.test(value)) {
    return "medium";
  }

  if (/대형/i.test(value) || /\b(l|large)\b/i.test(value)) {
    return "large";
  }

  return "unknown";
};

const extractDistrict = (value: string) =>
  housingDistricts.find((district) => value.includes(district));

const extractWard = (value: string) =>
  value.match(/(\d+)\s*구/)?.[1] ?? value.match(/\bward\s*(\d+)\b/i)?.[1];

const extractPlot = (value: string) =>
  value.match(/(\d+)\s*번지/)?.[1] ?? value.match(/\bplot\s*(\d+)\b/i)?.[1];

const buildAddress = (district?: string, ward?: string, plot?: string) =>
  [district, ward ? `${ward}구` : undefined, plot ? `${plot}번지` : undefined]
    .filter(Boolean)
    .join(" ");

const shouldKeepRowAsListing = (
  rawText: string,
  server?: string,
  size?: HousingListingSize,
  district?: string,
  ward?: string,
  plot?: string,
) =>
  Boolean(server || district || ward || plot || size !== "unknown") &&
  !/서버.*중형.*대형|server.*medium.*large/i.test(rawText);

export const parseHousingListingsCsv = (
  csvText: string,
  options: ParseOptions = {},
): HousingListingsResponse => {
  if (!csvText.trim() || isLikelyHtmlResponse(csvText)) {
    return createHousingListingsFallbackResponse(
      "매물 정보를 자동으로 정리하지 못했어요. 원본 시트에서 최신 매물을 확인해주세요.",
      options,
    );
  }

  const rawRows = parseCsvRows(csvText);
  const rawPreview = createRawPreview(rawRows);
  const listings = rawRows.flatMap((rawCells, rowIndex) => {
    const rawText = rawCells.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    if (!rawText) {
      return [];
    }

    const server = normalizeHousingServer(rawText);
    const size = normalizeHousingListingSize(rawText);
    const district = extractDistrict(rawText);
    const ward = extractWard(rawText);
    const plot = extractPlot(rawText);

    if (!shouldKeepRowAsListing(rawText, server, size, district, ward, plot)) {
      return [];
    }

    const address = buildAddress(district, ward, plot);

    return [
      {
        id: createListingId(rowIndex, rawText),
        server,
        size,
        district,
        ward,
        plot,
        address: address || undefined,
        note: rawText,
        rawText,
        rawCells,
      },
    ];
  });

  return {
    ok: true,
    listings,
    rawRows,
    rawPreview,
    updatedAt: (options.now ?? new Date()).toISOString(),
    sourceUrl: options.sourceUrl ?? housingListingsSheetUrl,
    message:
      listings.length > 0
        ? undefined
        : "매물 정보를 자동으로 정리하지 못했어요. 원본 시트에서 최신 매물을 확인해주세요.",
  };
};

export const createHousingListingsFallbackResponse = (
  message = "매물 정보를 불러오지 못했어요. 잠시 후 다시 확인하거나 원본 시트를 확인해주세요.",
  options: ParseOptions = {},
): HousingListingsResponse => ({
  ok: false,
  listings: [],
  rawRows: [],
  rawPreview: [],
  updatedAt: (options.now ?? new Date()).toISOString(),
  sourceUrl: options.sourceUrl ?? housingListingsSheetUrl,
  message,
});
