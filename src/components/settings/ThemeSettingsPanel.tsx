import { Check } from "lucide-react";
import { themeColors } from "../../data/themes";
import { useThemeStore } from "../../stores/useThemeStore";

export const ThemeSettingsPanel = () => {
  const themeColorId = useThemeStore((state) => state.themeColorId);
  const setThemeColor = useThemeStore((state) => state.setThemeColor);

  return (
    <section className="card space-y-4">
      <div>
        <p className="muted-label">디자인</p>
        <h2 className="text-lg font-bold">테마 컬러</h2>
        <p className="mt-1 text-sm text-ink-muted">
          대표 컬러 하나를 고르면 체크, 버튼, 스티커 색이 같은 계열로 정리됩니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {themeColors.map((themeColor) => {
          const selected = themeColor.id === themeColorId;

          return (
            <button
              key={themeColor.id}
              type="button"
              className={[
                "flex min-h-12 items-center gap-2 rounded-[14px] border bg-card/88 px-2.5 py-2 text-left outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/35",
                selected
                  ? "border-primary bg-primary-soft/60 text-primary"
                  : "border-[rgb(var(--color-line-muted))] text-ink-muted",
              ].join(" ")}
              onClick={() => setThemeColor(themeColor.id)}
              aria-pressed={selected}
            >
              <span
                className={[
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/80 shadow-[0_1px_4px_rgb(30_35_40/0.12)]",
                  themeColor.swatchClassName,
                ].join(" ")}
              >
                {selected ? (
                  <Check aria-hidden size={14} strokeWidth={3} className="text-white" />
                ) : null}
              </span>
              <span className="min-w-0 text-sm font-black text-ink">{themeColor.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
