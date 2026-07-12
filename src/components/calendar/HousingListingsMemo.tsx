import { ExternalLink } from "lucide-react";

const housingListingsSheetUrl =
  "https://docs.google.com/spreadsheets/d/1Y0UiNqNyBfmLLjpQNLv2KOkQYnFXP8iipDJmODzyozg/edit";

export const HousingListingsMemo = () => (
  <section className="calendar-panel p-4">
    <div className="flex items-start justify-between gap-3 max-[430px]:flex-col">
      <div>
        <span className="muted-label block">하우징</span>
        <h2 className="text-sm font-black text-ink">하우징 매물 현황</h2>
        <p className="mt-2 text-xs font-medium leading-relaxed text-ink-muted">
          점검이나 패치, 시트 갱신 시점에 따라 실제 일정과 매물 상태가 다를 수 있어요.
          청약 전에는 게임 내에서 다시 확인해주세요.
        </p>
        <p className="mt-2 text-xs font-bold text-ink-muted">
          하우징 정보 제공:{" "}
          <a
            href="https://x.com/ff14gingerS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-primary underline decoration-primary/35 underline-offset-2 transition hover:text-primary/80"
          >
            @ff14gingers
          </a>
        </p>
      </div>

      <a
        href={housingListingsSheetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[rgb(var(--color-line-muted))] bg-primary px-3 text-xs font-black text-white transition hover:brightness-[0.98] active:scale-[0.98]"
      >
        원본 시트 보기
        <ExternalLink aria-hidden size={13} />
      </a>
    </div>
  </section>
);
