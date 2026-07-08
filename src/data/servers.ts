export const KOREAN_FF14_SERVERS = ["모그리", "초코보", "카벙클", "톤베리", "펜리르"] as const;

export type KoreanServerName = (typeof KOREAN_FF14_SERVERS)[number];

export const DEFAULT_KOREAN_SERVER: KoreanServerName = "톤베리";
