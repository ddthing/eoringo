import type { FrontlineMap } from "../types";

export const frontlineMaps: FrontlineMap[] = [
  {
    id: "seal-rock",
    shortName: "봉바",
    koName: "봉인된 바위섬",
    displayName: "봉인된 바위섬 (쟁탈전)",
  },
  {
    id: "fields-of-glory",
    shortName: "쇄빙",
    koName: "영광의 평원",
    displayName: "영광의 평원 (쇄빙전)",
  },
  {
    id: "onsal",
    shortName: "온살",
    koName: "온살 하카이르",
    displayName: "온살 하카이르 (계절 끝 합전)",
  },
  {
    id: "worqor-chitte",
    shortName: "워코",
    koName: "워코 치테",
    displayName: "워코 치테 (연습전)",
  },
  {
    id: "borderland-ruins",
    shortName: "제압",
    koName: "외곽 유적지대",
    displayName: "외곽 유적지대 (제압전)",
  },
];

export const frontlineRotation = {
  seedDate: "2026-06-03",
  seedMapId: "seal-rock",
  pattern: [
    "seal-rock",
    "fields-of-glory",
    "onsal",
    "worqor-chitte",
    "seal-rock",
    "borderland-ruins",
    "onsal",
    "worqor-chitte",
  ] as FrontlineMap["id"][],
  overrides: {} as Record<string, FrontlineMap["id"]>,
};
