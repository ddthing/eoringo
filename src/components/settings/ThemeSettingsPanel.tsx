import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import type { AppearanceMode } from "../../domain/theme/appearance";
import { themeColors } from "../../data/themes";
import { isValidHexColor, normalizeHexColor } from "../../lib/color";
import { useThemeStore } from "../../stores/useThemeStore";

const appearanceOptions: Array<{
  id: AppearanceMode;
  label: string;
  description: string;
  icon: typeof Monitor;
}> = [
  { id: "system", label: "시스템 설정", description: "기기 설정을 따라갑니다", icon: Monitor },
  { id: "light", label: "라이트", description: "항상 밝게 표시합니다", icon: Sun },
  { id: "dark", label: "다크", description: "항상 어둡게 표시합니다", icon: Moon },
];

export const ThemeSettingsPanel = () => {
  const themeColorId = useThemeStore((state) => state.themeColorId);
  const customAccentColor = useThemeStore((state) => state.customAccentColor);
  const appearanceMode = useThemeStore((state) => state.appearanceMode);
  const setThemeColor = useThemeStore((state) => state.setThemeColor);
  const setCustomAccentColor = useThemeStore((state) => state.setCustomAccentColor);
  const setAppearanceMode = useThemeStore((state) => state.setAppearanceMode);
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

      <div>
        <p className="mb-2 text-xs font-black text-ink">화면 모드</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {appearanceOptions.map((option) => {
            const selected = option.id === appearanceMode;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                className={[
                  "flex min-h-14 items-center gap-2.5 rounded-[14px] border px-3 py-2 text-left outline-none transition-[background-color,border-color,color,transform] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/35",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-[rgb(var(--color-line-muted))] bg-card/88 text-ink-muted hover:border-[rgb(var(--color-line-soft))] hover:bg-card-soft/65",
                ].join(" ")}
                onClick={() => setAppearanceMode(option.id)}
                aria-pressed={selected}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-card-soft">
                  <Icon aria-hidden size={16} strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-ink">{option.label}</span>
                  <span className="block text-[11px] font-semibold text-ink-muted">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[rgb(var(--color-line-muted))] pt-4">
        <p className="mb-2 text-xs font-black text-ink">강조 색상</p>

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
                  style={
                    themeColor.id === "custom"
                      ? { backgroundColor: customAccentColor }
                      : undefined
                  }
                  className={[
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-card/80 shadow-[0_1px_4px_rgb(var(--color-shadow)/0.16)]",
                    themeColor.swatchClassName,
                  ].join(" ")}
                >
                  {selected ? (
                    <Check
                      aria-hidden
                      size={14}
                      strokeWidth={3}
                      className="text-primary-foreground"
                    />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-ink">
                    {themeColor.label}
                  </span>
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
            <span className="sticker">Preview</span>
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
              className="field font-mono uppercase"
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
