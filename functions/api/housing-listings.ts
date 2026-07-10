import {
  createHousingListingsFallbackResponse,
  housingListingsCsvUrl,
  housingListingsGvizCsvUrl,
  housingListingsSheetUrl,
  isLikelyHtmlResponse,
  parseHousingListingsCsv,
} from "../../src/lib/housingListingsParser";

const jsonResponse = (body: unknown, cacheSeconds: number) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    },
  });

export const onRequestGet = async () => {
  try {
    for (const csvUrl of [housingListingsCsvUrl, housingListingsGvizCsvUrl]) {
      const response = await fetch(csvUrl);

      if (!response.ok) {
        continue;
      }

      const csvText = await response.text();

      if (!csvText.trim() || isLikelyHtmlResponse(csvText)) {
        continue;
      }

      const parsed = parseHousingListingsCsv(csvText, {
        sourceUrl: housingListingsSheetUrl,
      });

      return jsonResponse(parsed, 600);
    }

    return jsonResponse(
      createHousingListingsFallbackResponse(
        "매물 정보를 자동으로 정리하지 못했어요. 원본 시트에서 최신 매물을 확인해주세요.",
        { sourceUrl: housingListingsSheetUrl },
      ),
      60,
    );
  } catch {
    return jsonResponse(
      createHousingListingsFallbackResponse(
        "매물 정보를 자동으로 정리하지 못했어요. 원본 시트에서 최신 매물을 확인해주세요.",
        { sourceUrl: housingListingsSheetUrl },
      ),
      60,
    );
  }
};
