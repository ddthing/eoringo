export type ThemeColorId =
  | "mint"
  | "pink"
  | "lavender"
  | "cream"
  | "gray"
  | "custom"
  | "sky"
  | "lemon"
  | "peach";

export type ThemeColor = {
  id: ThemeColorId;
  label: string;
  swatchClassName: string;
  description?: string;
};

export const defaultThemeColorId: ThemeColorId = "gray";

export const themeColors: ThemeColor[] = [
  {
    id: "pink",
    label: "Pink",
    swatchClassName: "bg-[rgb(238_154_181)]",
  },
  {
    id: "lavender",
    label: "Lavender",
    swatchClassName: "bg-[rgb(176_154_219)]",
  },
  {
    id: "mint",
    label: "Mint",
    swatchClassName: "bg-[rgb(142_191_130)]",
  },
  {
    id: "cream",
    label: "Cream",
    swatchClassName: "bg-[rgb(217_168_108)]",
  },
  {
    id: "lemon",
    label: "Lemon",
    swatchClassName: "bg-[rgb(229_205_87)]",
  },
  {
    id: "gray",
    label: "Gray",
    swatchClassName: "bg-[rgb(141_138_148)]",
  },
  {
    id: "custom",
    label: "Custom",
    swatchClassName: "bg-primary",
    description: "나만의 포인트 컬러",
  },
];

export const grayThemeTokens = {
  accent: "#8d8a94",
  accentSoft: "#eceaf0",
} as const;

const legacyThemeColorIds: ThemeColorId[] = ["sky", "peach"];

export const isThemeColorId = (value: unknown): value is ThemeColorId =>
  themeColors.some((themeColor) => themeColor.id === value) ||
  legacyThemeColorIds.includes(value as ThemeColorId);
