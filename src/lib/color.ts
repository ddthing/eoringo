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

export const hexToRgbString = (value: string) => {
  const { r, g, b } = hexToRgb(value);

  return `${r} ${g} ${b}`;
};

export const getSoftAccentColor = (value: string) => {
  const { r, g, b } = hexToRgb(value);

  return `${mixWithWhite(r)} ${mixWithWhite(g)} ${mixWithWhite(b)}`;
};
