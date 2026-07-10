import { useEffect, useState } from "react";
import {
  createHousingListingsFallbackResponse,
  housingListingsSheetUrl,
  isLikelyHtmlResponse,
  type HousingListingsResponse,
} from "../lib/housingListingsParser";

type HousingListingsState = {
  data: HousingListingsResponse;
  loading: boolean;
  error: string | null;
};

export const useHousingListings = () => {
  const [state, setState] = useState<HousingListingsState>(() => ({
    data: createHousingListingsFallbackResponse(undefined, { sourceUrl: housingListingsSheetUrl }),
    loading: true,
    error: null,
  }));

  useEffect(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, loading: true, error: null }));

    fetch("/api/housing-listings", { signal: controller.signal })
      .then(async (response) => {
        const text = await response.text();

        if (!response.ok) {
          throw new Error(`Housing listings request failed: ${response.status}`);
        }

        if (isLikelyHtmlResponse(text)) {
          console.warn(
            "/api/housing-listings returned non-JSON response. If running locally, use Cloudflare Pages dev to test Functions.",
          );
          throw new Error("매물 API가 아직 준비되지 않았어요. 원본 시트를 확인해주세요.");
        }

        try {
          return JSON.parse(text) as HousingListingsResponse;
        } catch {
          console.warn(
            "/api/housing-listings returned invalid JSON. If running locally, use Cloudflare Pages dev to test Functions.",
          );
          throw new Error("매물 정보를 자동으로 정리하지 못했어요. 원본 시트에서 최신 매물을 확인해주세요.");
        }
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: data.ok ? null : data.message ?? null });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "매물 정보를 불러오지 못했어요.";

        setState({
          data: createHousingListingsFallbackResponse(
            "매물 정보를 자동으로 정리하지 못했어요. 원본 시트에서 최신 매물을 확인해주세요.",
            {
              sourceUrl: housingListingsSheetUrl,
            },
          ),
          loading: false,
          error: message,
        });
      });

    return () => controller.abort();
  }, []);

  return state;
};
