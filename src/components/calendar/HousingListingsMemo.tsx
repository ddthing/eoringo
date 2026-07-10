import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { koreanHousingServers, type HousingListingSize } from "../../lib/housingListingsParser";
import { useHousingListings } from "../../hooks/useHousingListings";

const sizeLabels: Record<HousingListingSize | "all", string> = {
  all: "전체",
  medium: "중형",
  large: "대형",
  unknown: "미확인",
};

const formatUpdatedAt = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "확인 불가";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

export const HousingListingsMemo = () => {
  const { data, error, loading } = useHousingListings();
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<HousingListingSize | "all">("all");

  const filteredListings = useMemo(
    () =>
      data.listings.filter((listing) => {
        const serverMatches = serverFilter === "all" || listing.server === serverFilter;
        const sizeMatches = sizeFilter === "all" || listing.size === sizeFilter;

        return serverMatches && sizeMatches;
      }),
    [data.listings, serverFilter, sizeFilter],
  );

  const mediumCount = filteredListings.filter((listing) => listing.size === "medium").length;
  const largeCount = filteredListings.filter((listing) => listing.size === "large").length;
  const rawPreviewRows = (data.rawPreview ?? [])
    .map((rowText) => rowText.trim())
    .filter(Boolean)
    .slice(0, 15);
  const shouldShowStructuredList = filteredListings.length > 0;
  const shouldShowRawPreview = !shouldShowStructuredList && rawPreviewRows.length > 0;

  return (
    <section className="memo-card bg-card/86 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="muted-label block">커뮤니티 시트</span>
          <h2 className="text-sm font-black text-ink">하우징 매물 메모</h2>
          <p className="mt-1 text-xs font-medium leading-relaxed text-ink-muted">
            커뮤니티 공유 시트 기준이에요. 점검이나 패치, 시트 갱신 시점에 따라 실제
            일정과 매물 상태가 다를 수 있어요. 청약 전에는 게임 내에서 다시
            확인해주세요.
          </p>
          <p className="mt-1 text-xs font-bold text-ink-muted">
            정보 제공: @ff14gingers
          </p>
        </div>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-[rgb(var(--color-line-muted))] bg-card-soft/72 px-3 text-xs font-black text-primary"
        >
          원본 시트 보기
          <ExternalLink aria-hidden size={13} />
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-primary-soft px-2 py-1 font-black text-primary">
          중형 {mediumCount}건
        </span>
        <span className="rounded-full bg-primary-soft px-2 py-1 font-black text-primary">
          대형 {largeCount}건
        </span>
        <span className="text-ink-muted">최근 갱신: {formatUpdatedAt(data.updatedAt)}</span>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <p className="mb-1 text-[11px] font-black text-ink-muted">서버</p>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...koreanHousingServers].map((server) => {
              const selected = serverFilter === server;

              return (
                <button
                  key={server}
                  type="button"
                  className={[
                    "min-h-9 rounded-full border px-2.5 text-xs font-bold transition active:scale-[0.98]",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-[rgb(var(--color-line-muted))] bg-card-soft/70 text-ink-muted",
                  ].join(" ")}
                  onClick={() => setServerFilter(server)}
                  aria-pressed={selected}
                >
                  {server === "all" ? "전체" : server}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-black text-ink-muted">크기</p>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "medium", "large"] as const).map((size) => {
              const selected = sizeFilter === size;

              return (
                <button
                  key={size}
                  type="button"
                  className={[
                    "min-h-9 rounded-full border px-2.5 text-xs font-bold transition active:scale-[0.98]",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-[rgb(var(--color-line-muted))] bg-card-soft/70 text-ink-muted",
                  ].join(" ")}
                  onClick={() => setSizeFilter(size)}
                  aria-pressed={selected}
                >
                  {sizeLabels[size]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {loading ? (
          <p className="rounded-[12px] bg-card-soft/72 px-3 py-3 text-sm font-bold text-ink-muted">
            매물 메모를 불러오는 중이에요.
          </p>
        ) : null}

        {!loading && shouldShowStructuredList
          ? filteredListings.slice(0, 12).map((listing) => (
              <article
                key={listing.id}
                className="rounded-[12px] border border-[rgb(var(--color-line-muted))] bg-card-soft/60 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-black text-primary">
                    {listing.server ?? "서버 미확인"}
                  </span>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-black text-ink-muted">
                    {sizeLabels[listing.size ?? "unknown"]}
                  </span>
                  {listing.address ? (
                    <span className="text-xs font-bold text-ink">{listing.address}</span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-ink-muted">
                  {listing.rawText}
                </p>
              </article>
            ))
          : null}

        {!loading && shouldShowRawPreview ? (
          <div className="rounded-[12px] border border-dashed border-[rgb(var(--color-line-soft))] bg-card-soft/60 p-3">
            <p className="text-sm font-bold text-ink">
              매물 정보를 자동으로 정리하지 못했어요.
            </p>
            <p className="mt-1 text-xs font-medium text-ink-muted">
              시트 구조가 바뀌어 자동 정리가 어려워요. 원본 시트에서 최신 매물을
              확인해주세요.
            </p>
            <p className="mt-3 text-[11px] font-black text-primary">시트 원문 미리보기</p>
            <div className="mt-2 space-y-1">
              {rawPreviewRows.map((rowText, index) => (
                <p
                  key={`${index}-${rowText}`}
                  className="truncate rounded-[10px] bg-card/70 px-2 py-1 text-[11px] font-medium text-ink-muted"
                >
                  {rowText}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && !shouldShowStructuredList && !shouldShowRawPreview ? (
          <p className="rounded-[12px] bg-card-soft/72 px-3 py-3 text-sm font-bold text-ink-muted">
            {data.message ??
              error ??
              "매물 정보를 불러오지 못했어요. 잠시 후 다시 확인하거나 원본 시트를 확인해주세요."}
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-[11px] font-medium leading-relaxed text-ink-muted">
        출처: 하우징 청약 달력 공유 시트. 이 정보는 참고용이에요.
      </p>
    </section>
  );
};
