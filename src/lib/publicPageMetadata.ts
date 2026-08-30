export type PublicPageDefinition = {
  path: `/${string}`;
  exportName: string;
  title: string;
  description: string;
  robots: "index,follow" | "noindex,nofollow";
  ogType: "website" | "article";
  schemaType?: "Article" | "CollectionPage" | "AboutPage";
  publishedAt?: string;
  modifiedAt?: string;
  reviewedAt?: string;
};

export const publicPageDefinitions = {
  guide: {
    path: "/guide",
    exportName: "GuideIndexPage",
    title: "파이널판타지14 루틴을, 오늘 해야 할 일로 바꾸는 법",
    description:
      "에오링고는 일일·주간 숙제와 전장·하우징 일정을 캐릭터별로 정리하는 로컬 우선 도구입니다. 이 가이드는 기능 소개를 넘어, 무엇을 왜 기록하는지와 기록을 오래 유지하는 방법을 설명합니다.",
    robots: "index,follow",
    ogType: "website",
    schemaType: "CollectionPage",
    publishedAt: "2026-08-23",
    modifiedAt: "2026-08-23",
    reviewedAt: "2026년 8월 23일",
  },
  routine: {
    path: "/guide/routine",
    exportName: "RoutineGuidePage",
    title: "일일·주간 숙제를 덜 놓치는 정리법",
    description:
      "모든 숙제를 같은 무게로 보지 않고, 리셋 규칙과 실제 플레이 시간을 기준으로 오늘의 우선순위를 정하는 방법입니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
    publishedAt: "2026-08-23",
    modifiedAt: "2026-08-23",
    reviewedAt: "2026년 8월 23일",
  },
  gettingStarted: {
    path: "/guide/getting-started",
    exportName: "GettingStartedGuidePage",
    title: "10분 만에 나에게 맞는 루틴 만들기",
    description:
      "에오링고를 처음 열었을 때 무엇을 입력하고, 어떤 데이터가 어디에 저장되며, 언제 Google 계정을 연결하면 좋은지 단계별로 안내합니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
    publishedAt: "2026-08-23",
    modifiedAt: "2026-08-23",
    reviewedAt: "2026년 8월 23일",
  },
  calendar: {
    path: "/guide/calendar",
    exportName: "CalendarGuidePage",
    title: "전장·하우징 달력을 읽는 방법",
    description:
      "에오링고의 월간 달력이 어떤 기준으로 날짜를 계산하는지, 커뮤니티 기반 하우징 정보와 개인 일정을 어떻게 구분해 봐야 하는지 설명합니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
    publishedAt: "2026-08-23",
    modifiedAt: "2026-08-23",
    reviewedAt: "2026년 8월 23일",
  },
  taskCatalog: {
    path: "/guide/task-catalog",
    exportName: "TaskCatalogGuidePage",
    title: "에오링고 숙제 항목의 리셋·횟수 기준표",
    description:
      "에오링고 기본 목록이 어떤 주기, 횟수, 캐릭터 범위로 동작하는지 실제 코드에 기록된 모델과 사용자의 판단 기준을 함께 설명합니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
    publishedAt: "2026-08-23",
    modifiedAt: "2026-08-23",
    reviewedAt: "2026년 8월 23일",
  },
  about: {
    path: "/about",
    exportName: "AboutPage",
    title: "에오링고는 무엇을 기록하고, 무엇을 주장하지 않는가",
    description:
      "에오링고의 제작 목적, 데이터 계산 방식, 출처를 다루는 방법과 수정 요청 경로를 공개합니다. 기능 소개보다 먼저 서비스의 경계를 확인할 수 있는 페이지입니다.",
    robots: "index,follow",
    ogType: "website",
    schemaType: "AboutPage",
    publishedAt: "2026-08-23",
    modifiedAt: "2026-08-23",
    reviewedAt: "2026년 8월 23일",
  },
  privacy: {
    path: "/privacy",
    exportName: "PrivacyNoticePage",
    title: "개인정보 안내",
    description:
      "에오링고의 브라우저 저장, Google 연결, Supabase 동기화, 알림과 광고 쿠키 범위를 안내합니다.",
    robots: "index,follow",
    ogType: "website",
    modifiedAt: "2026-08-25",
    reviewedAt: "2026년 8월 25일",
  },
  terms: {
    path: "/terms",
    exportName: "TermsNoticePage",
    title: "서비스 이용 안내",
    description:
      "에오링고의 데이터 관리, 로그인, 백업과 서비스 이용 기준을 안내합니다.",
    robots: "index,follow",
    ogType: "website",
    modifiedAt: "2026-08-25",
    reviewedAt: "2026년 8월 25일",
  },
  demo: {
    path: "/demo",
    exportName: "DemoPage",
    title: "로그인 없이 체험",
    description:
      "샘플 캐릭터와 루틴으로 에오링고의 오늘 화면을 로그인 없이 체험합니다. 샘플 체크는 저장되지 않습니다.",
    robots: "noindex,nofollow",
    ogType: "website",
  },
} as const satisfies Record<string, PublicPageDefinition>;

export const publicPages = Object.values(publicPageDefinitions);

export const getDocumentTitle = (page: Pick<PublicPageDefinition, "title">) =>
  `${page.title} | 에오링고`;
