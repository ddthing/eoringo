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
    label: "핑크",
    swatchClassName: "bg-[rgb(238_154_181)]",
  },
  {
    id: "lavender",
    label: "라벤더",
    swatchClassName: "bg-[rgb(176_154_219)]",
  },
  {
    id: "mint",
    label: "민트",
    swatchClassName: "bg-[rgb(142_191_130)]",
  },
  {
    id: "cream",
    label: "크림",
    swatchClassName: "bg-[rgb(217_168_108)]",
  },
  {
    id: "lemon",
    label: "레몬",
    swatchClassName: "bg-[rgb(229_205_87)]",
  },
  {
    id: "gray",
    label: "그레이",
    swatchClassName: "bg-[rgb(39_39_42)]",
  },
  {
    id: "custom",
    label: "직접 지정",
    swatchClassName: "bg-primary",
    description: "나만의 포인트 컬러",
  },
];

export const grayThemeTokens = {
  accent: "#27272a",
  accentSoft: "#f4f4f5",
} as const;

const legacyThemeColorIds: ThemeColorId[] = ["sky", "peach"];

export const isThemeColorId = (value: unknown): value is ThemeColorId =>
  themeColors.some((themeColor) => themeColor.id === value) ||
  legacyThemeColorIds.includes(value as ThemeColorId);
