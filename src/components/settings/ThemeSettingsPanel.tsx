import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { themeColors } from "../../data/themes";
import { isValidHexColor, normalizeHexColor } from "../../lib/color";
import { useThemeStore } from "../../stores/useThemeStore";

export const ThemeSettingsPanel = () => {
  const themeColorId = useThemeStore((state) => state.themeColorId);
  const customAccentColor = useThemeStore((state) => state.customAccentColor);
  const setThemeColor = useThemeStore((state) => state.setThemeColor);
  const setCustomAccentColor = useThemeStore((state) => state.setCustomAccentColor);
  const [customDraft, setCustomDraft] = useState(customAccentColor);

  useEffect(() => {
    setCustomDraft(customAccentColor);
  }, [customAccentColor]);

  return (
    <section className="card space-y-4">
      <div>
        <p className="muted-label">디자인</p>
        <h2 className="text-lg font-bold">테마</h2>
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
                style={themeColor.id === "custom" ? { backgroundColor: customAccentColor } : undefined}
                className={[
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/80 shadow-[0_1px_4px_rgb(30_35_40/0.12)]",
                  themeColor.swatchClassName,
                ].join(" ")}
              >
                {selected ? (
                  <Check aria-hidden size={14} strokeWidth={3} className="text-white" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-ink">{themeColor.label}</span>
                {themeColor.description ? (
                  <span className="block truncate text-[11px] font-bold text-ink-muted">
                    {themeColor.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {themeColorId === "custom" ? (
        <div className="rounded-[16px] border border-[rgb(var(--color-line-muted))] bg-card-soft/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-ink">Custom</p>
              <p className="mt-0.5 text-xs font-medium text-ink-muted">
                나만의 포인트 컬러
              </p>
            </div>
            <span className="sticker" style={{ color: customAccentColor }}>
              Preview
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[3rem_1fr] gap-2">
            <input
              type="color"
              value={customAccentColor}
              className="h-10 w-12 cursor-pointer rounded-[12px] border border-[rgb(var(--color-line-soft))] bg-card p-1"
              onChange={(event) => {
                setCustomDraft(event.target.value);
                setCustomAccentColor(event.target.value);
              }}
              aria-label="Custom 포인트 컬러 선택"
            />
            <input
              type="text"
              value={customDraft}
              className="field-input font-mono uppercase"
              spellCheck={false}
              inputMode="text"
              placeholder="#EE9AB5"
              onChange={(event) => {
                const nextValue = event.target.value;
                setCustomDraft(nextValue);

                if (isValidHexColor(nextValue)) {
                  setCustomAccentColor(nextValue);
                }
              }}
              onBlur={() => {
                const normalized = normalizeHexColor(customDraft);
                setCustomDraft(normalized);
                setCustomAccentColor(normalized);
              }}
              aria-label="Custom HEX 색상값"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};
