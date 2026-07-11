export const settingsSectionIds = [
  "characters",
  "theme",
  "notifications",
  "backup",
  "data",
  "about",
] as const;

export type SettingsSectionId = (typeof settingsSectionIds)[number];

const settingsSectionIdSet = new Set<string>(settingsSectionIds);

export const getSettingsSectionId = (hash: string): SettingsSectionId | null => {
  const sectionId = hash.replace(/^#/, "");

  return settingsSectionIdSet.has(sectionId) ? (sectionId as SettingsSectionId) : null;
};
