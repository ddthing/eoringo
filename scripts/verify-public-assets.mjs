import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const distRoot = resolve(projectRoot, "dist");
const siteOrigin = (process.env.VITE_PUBLIC_SITE_ORIGIN || "https://eoringo.pages.dev").replace(
  /\/+$/,
  "",
);

const readText = (path) => readFile(path, "utf8");
const normalizeText = (value) => value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const publicAdsText = normalizeText(await readText(join(projectRoot, "public", "ads.txt")));
const distAdsText = normalizeText(await readText(join(distRoot, "ads.txt")));

assert(distAdsText === publicAdsText, "dist/ads.txt must match public/ads.txt exactly.");

const adsLines = publicAdsText
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

assert(adsLines.length > 0, "public/ads.txt must contain at least one seller record.");

for (const line of adsLines) {
  const [domain, publisherId, relationship, certificationId] = line
    .split(",")
    .map((field) => field.trim());

  assert(
    domain && publisherId && relationship && certificationId,
    `Invalid ads.txt record: ${line}`,
  );
  assert(domain === "google.com", `Unexpected ads.txt seller domain: ${domain}`);
  assert(/^pub-\d{16}$/.test(publisherId), `Invalid Google publisher ID: ${publisherId}`);
  assert(
    relationship === "DIRECT" || relationship === "RESELLER",
    `Invalid ads.txt relationship: ${relationship}`,
  );
  assert(/^[a-f\d]{16}$/i.test(certificationId), `Invalid certification ID: ${certificationId}`);
}

const robotsText = normalizeText(await readText(join(distRoot, "robots.txt")));
const sitemapText = normalizeText(await readText(join(distRoot, "sitemap.xml")));
const rootHtml = await readText(join(distRoot, "index.html"));

assert(robotsText.includes(`Sitemap: ${siteOrigin}/sitemap.xml`), "robots.txt must publish the configured sitemap URL.");
assert(rootHtml.includes('<meta name="robots" content="noindex,nofollow" />'), "The app shell must remain noindex.");

const sitemapPaths = [...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, url]) => new URL(url).pathname,
);

assert(sitemapPaths.length > 0, "sitemap.xml must contain at least one URL.");

for (const path of sitemapPaths) {
  const pageHtml = await readText(join(distRoot, path.slice(1), "index.html"));
  const descriptionCount = (pageHtml.match(/<meta\s+name="description"/g) ?? []).length;
  const openGraphDescriptionCount =
    (pageHtml.match(/<meta\s+property="og:description"/g) ?? []).length;
  const canonicalCount = (pageHtml.match(/<link\s+rel="canonical"/g) ?? []).length;

  assert(pageHtml.includes('id="prerendered-content"'), `Missing prerendered content for ${path}.`);
  assert(descriptionCount === 1, `Expected one description meta tag for ${path}.`);
  assert(openGraphDescriptionCount === 1, `Expected one Open Graph description for ${path}.`);
  assert(canonicalCount === 1, `Expected one canonical link for ${path}.`);
  assert(pageHtml.includes('content="index,follow"'), `Sitemap page must be indexable: ${path}.`);
}

console.log(`Public asset verification passed (${adsLines.length} ads.txt record, ${sitemapPaths.length} sitemap URL(s)).`);
