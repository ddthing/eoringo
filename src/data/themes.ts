export type ThemeColorId = "mint" | "pink" | "lavender" | "sky" | "lemon" | "peach";

export type ThemeColor = {
  id: ThemeColorId;
  label: string;
  swatchClassName: string;
};

export const defaultThemeColorId: ThemeColorId = "mint";

export const themeColors: ThemeColor[] = [
  {
    id: "mint",
    label: "Mint",
    swatchClassName: "bg-[rgb(142_191_130)]",
  },
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
    id: "sky",
    label: "Sky",
    swatchClassName: "bg-[rgb(119_166_213)]",
  },
  {
    id: "lemon",
    label: "Lemon",
    swatchClassName: "bg-[rgb(217_189_91)]",
  },
  {
    id: "peach",
    label: "Peach",
    swatchClassName: "bg-[rgb(226_151_119)]",
  },
];

export const isThemeColorId = (value: unknown): value is ThemeColorId =>
  themeColors.some((themeColor) => themeColor.id === value);
