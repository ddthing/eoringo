export const defaultCustomAccentColor = "#ee9ab5";

const hexColorPattern = /^#?[0-9a-fA-F]{6}$/;

export const isValidHexColor = (value: unknown): value is string =>
  typeof value === "string" && hexColorPattern.test(value.trim());

export const normalizeHexColor = (
  value: unknown,
  fallback = defaultCustomAccentColor,
) => {
  if (!isValidHexColor(value)) {
    return fallback;
  }

  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  return hex.toLowerCase();
};

const hexToRgb = (value: string) => {
  const normalized = normalizeHexColor(value).slice(1);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const mixWithWhite = (channel: number, weight = 0.82) =>
  Math.round(channel * (1 - weight) + 255 * weight);

const darkSurface = { r: 21, g: 24, b: 29 } as const;

const mixWithDarkSurface = (channel: number, surfaceChannel: number) =>
  Math.round(channel * 0.2 + surfaceChannel * 0.8);

const toLinearChannel = (channel: number) => {
  const normalized = channel / 255;

  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const getRelativeLuminance = (value: string) => {
  const { r, g, b } = hexToRgb(value);

  return (
    0.2126 * toLinearChannel(r) +
    0.7152 * toLinearChannel(g) +
    0.0722 * toLinearChannel(b)
  );
};

export const hexToRgbString = (value: string) => {
  const { r, g, b } = hexToRgb(value);

  return `${r} ${g} ${b}`;
};

export const getSoftAccentColor = (
  value: string,
  appearance: "light" | "dark" = "light",
) => {
  const { r, g, b } = hexToRgb(value);

  if (appearance === "dark") {
    return [
      mixWithDarkSurface(r, darkSurface.r),
      mixWithDarkSurface(g, darkSurface.g),
      mixWithDarkSurface(b, darkSurface.b),
    ].join(" ");
  }

  return `${mixWithWhite(r)} ${mixWithWhite(g)} ${mixWithWhite(b)}`;
};

export const getContrastRatio = (first: string, second: string) => {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

export const getAccessibleForegroundColor = (background: string) => {
  const darkForeground = "#111820";
  const lightForeground = "#ffffff";
  const darkContrast = getContrastRatio(background, darkForeground);
  const lightContrast = getContrastRatio(background, lightForeground);

  if (darkContrast < 4.5 && lightContrast < 4.5) {
    return "0 0 0";
  }

  return darkContrast >= lightContrast
    ? "17 24 32"
    : "255 255 255";
};
