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
const siteOrigin = (process.env.VITE_PUBLIC_SITE_ORIGIN || "https://eoringo.pages.dev").replace(
  /\/+$/,
  "",
);

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const escapeJsonForHtml = (value) =>
  JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");

const upsertHeadTag = (html, pattern, tag) => {
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
};

const buildPage = (template, page, markup) => {
  const canonicalUrl = `${siteOrigin}${page.path}`;
  const documentTitle = `${page.title} | 에오링고`;
  const escapedTitle = escapeHtml(documentTitle);
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
        datePublished: page.publishedAt,
        dateModified: page.modifiedAt,
        author: {
          "@type": "Organization",
          name: "에오링고 운영팀",
          url: siteOrigin,
        },
        publisher: {
          "@type": "Organization",
          name: "에오링고",
          url: siteOrigin,
        },
      }
    : null;
  const schemaTag = jsonLd
    ? `<script id="eoringo-guide-jsonld" type="application/ld+json">${escapeJsonForHtml(jsonLd)}</script>`
    : "";

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapedTitle}</title>`);
  html = upsertHeadTag(
    html,
    /<meta\b(?=[^>]*\bname="description")[^>]*>/,
    `<meta name="description" content="${escapedDescription}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta\b(?=[^>]*\bname="robots")[^>]*>/,
    `<meta name="robots" content="${page.robots}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta\b(?=[^>]*\bproperty="og:title")[^>]*>/,
    `<meta property="og:title" content="${escapedTitle}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta\b(?=[^>]*\bproperty="og:description")[^>]*>/,
    `<meta property="og:description" content="${escapedDescription}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta\b(?=[^>]*\bproperty="og:type")[^>]*>/,
    `<meta property="og:type" content="${page.ogType}" />`,
  );
  html = upsertHeadTag(
    html,
    /<meta\b(?=[^>]*\bproperty="og:url")[^>]*>/,
    `<meta property="og:url" content="${escapedCanonical}" />`,
  );
  html = upsertHeadTag(
    html,
    /<link\b(?=[^>]*\brel="canonical")[^>]*>/,
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

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const buildRobots = () =>
  [
    "User-agent: *",
    "Allow: /",
    "Disallow: /auth/",
    "Disallow: /tasks/manage",
    "",
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    "",
  ].join("\n");

const buildSitemap = (pages) => {
  const urls = pages
    .filter((page) => page.robots === "index,follow")
    .map(
      (page) =>
        `  <url>\n    <loc>${escapeXml(`${siteOrigin}${page.path}`)}</loc>\n    <lastmod>${page.modifiedAt ?? "2026-08-23"}</lastmod>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

const template = await readFile(templatePath, "utf8");
let publicPages = [];
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  appType: "spa",
  plugins: [react()],
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
});

try {
  ({ publicPages } = await vite.ssrLoadModule("/src/lib/publicPageMetadata.ts"));
  const guideModule = await vite.ssrLoadModule("/src/components/guides/GuidePages.tsx");
  const legalModule = await vite.ssrLoadModule("/src/components/legal/LegalNoticePages.tsx");
  const demoModule = await vite.ssrLoadModule("/src/components/demo/DemoPage.tsx");
  const modules = { ...guideModule, ...legalModule, ...demoModule };

  await writeFile(join(distRoot, "robots.txt"), buildRobots());
  await writeFile(join(distRoot, "sitemap.xml"), buildSitemap(publicPages));

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
