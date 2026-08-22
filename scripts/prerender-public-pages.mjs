import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = resolve(projectRoot, "dist");
const templatePath = join(distRoot, "index.html");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const upsertHeadTag = (html, pattern, tag) =>
  pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `  ${tag}\n</head>`);

const buildPage = (template, page, markup) => {
  const canonicalUrl = `https://eoringo.pages.dev${page.path}`;
  const escapedTitle = escapeHtml(page.title);
  const escapedDescription = escapeHtml(page.description);
  const escapedCanonical = escapeHtml(canonicalUrl);
  const jsonLd = page.schemaType
    ? {
        "@context": "https://schema.org",
        "@type": page.schemaType,
        headline: page.title,
        name: page.title,
        description: page.description,
        url: canonicalUrl,
        inLanguage: "ko-KR",
        datePublished: "2026-08-23",
        dateModified: "2026-08-23",
        author: {
          "@type": "Organization",
          name: "에오링고 운영팀",
          url: "https://eoringo.pages.dev",
        },
        publisher: {
          "@type": "Organization",
          name: "에오링고",
          url: "https://eoringo.pages.dev",
        },
      }
    : null;
  const schemaTag = jsonLd
    ? `<script id="eoringo-guide-jsonld" type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
    : "";

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapedTitle}</title>`);
  html = upsertHeadTag(
    html,
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapedDescription}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta name="robots" content="[^"]*"\s*\/>/,
    `<meta name="robots" content="${page.robots}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapedTitle}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapedDescription}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta property="og:type" content="[^"]*"\s*\/>/,
    `<meta property="og:type" content="${page.ogType}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${escapedCanonical}" />`,
  );
  html = upsertHeadTag(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapedCanonical}" />`,
  );
  html = html.replace(/<script id="eoringo-guide-jsonld"[\s\S]*?<\/script>/, "");
  html = html.replace(
    /\s*<div id="root"><\/div>/,
    `\n    <div id="prerendered-content">${markup}</div>\n    <div id="root"></div>`,
  );
  if (schemaTag) {
    html = html.replace("</head>", `  ${schemaTag}\n</head>`);
  }

  return html;
};

const publicPages = [
  {
    path: "/guide",
    exportName: "GuideIndexPage",
    title: "파이널판타지14 루틴을, 오늘 해야 할 일로 바꾸는 법 | 에오링고",
    description: "에오링고가 일일·주간 루틴과 전장·하우징 일정을 캐릭터별로 정리하는 기준을 설명합니다.",
    robots: "index,follow",
    ogType: "website",
    schemaType: "CollectionPage",
  },
  {
    path: "/guide/routine",
    exportName: "RoutineGuidePage",
    title: "일일·주간 숙제를 덜 놓치는 정리법 | 에오링고",
    description: "파이널판타지14의 일일·주간·18시간 루틴을 실제 플레이 시간에 맞춰 정리하는 방법입니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
  },
  {
    path: "/guide/getting-started",
    exportName: "GettingStartedGuidePage",
    title: "에오링고 처음 사용하기 | 에오링고",
    description: "캐릭터 설정, 항목 숨김, JSON 백업과 선택적 Google 연결을 처음부터 안내합니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
  },
  {
    path: "/guide/calendar",
    exportName: "CalendarGuidePage",
    title: "전장·하우징 달력을 읽는 방법 | 에오링고",
    description: "KST 기준 전장·하우징 달력의 계산 방식과 커뮤니티 정보의 한계를 설명합니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
  },
  {
    path: "/guide/task-catalog",
    exportName: "TaskCatalogGuidePage",
    title: "숙제 항목의 리셋·횟수 기준표 | 에오링고",
    description: "에오링고 기본 숙제 항목의 주기, 횟수, 캐릭터 범위와 수정 기준을 설명합니다.",
    robots: "index,follow",
    ogType: "article",
    schemaType: "Article",
  },
  {
    path: "/about",
    exportName: "AboutPage",
    title: "에오링고 운영 원칙과 데이터 기준 | 에오링고",
    description: "에오링고의 제작 목적, 데이터 계산 방식, 외부 출처와 수정 요청 경로를 공개합니다.",
    robots: "index,follow",
    ogType: "website",
    schemaType: "AboutPage",
  },
  {
    path: "/privacy",
    exportName: "PrivacyNoticePage",
    title: "개인정보 안내 | 에오링고",
    description: "에오링고의 브라우저 저장, Google 연결, Supabase 동기화, 알림과 광고 쿠키 범위를 안내합니다.",
    robots: "index,follow",
    ogType: "website",
  },
  {
    path: "/terms",
    exportName: "TermsNoticePage",
    title: "서비스 이용 안내 | 에오링고",
    description: "에오링고의 데이터 관리, 로그인, 백업, 외부 정보의 이용 기준을 안내합니다.",
    robots: "index,follow",
    ogType: "website",
  },
  {
    path: "/demo",
    exportName: "DemoPage",
    title: "로그인 없이 체험 | 에오링고",
    description: "샘플 캐릭터와 루틴으로 에오링고의 오늘 화면을 로그인 없이 체험합니다.",
    robots: "noindex,nofollow",
    ogType: "website",
  },
];

const template = await readFile(templatePath, "utf8");
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  appType: "spa",
  plugins: [react()],
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
});

try {
  const guideModule = await vite.ssrLoadModule("/src/components/guides/GuidePages.tsx");
  const legalModule = await vite.ssrLoadModule("/src/components/legal/LegalNoticePages.tsx");
  const demoModule = await vite.ssrLoadModule("/src/components/demo/DemoPage.tsx");
  const modules = { ...guideModule, ...legalModule, ...demoModule };

  for (const page of publicPages) {
    const Page = modules[page.exportName];
    if (typeof Page !== "function") {
      throw new Error(`Missing prerender export: ${page.exportName}`);
    }

    const element = React.createElement(Page);
    const markup = renderToStaticMarkup(element);
    const outputDirectory = join(distRoot, page.path.slice(1));
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(join(outputDirectory, "index.html"), buildPage(template, page, markup));
  }
} finally {
  await vite.close();
}

console.log(`Pre-rendered ${publicPages.length} public pages.`);
