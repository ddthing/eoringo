import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const normalizeText = (value) => value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
const siteOrigin = (
  process.env.PUBLIC_SITE_ORIGIN || process.env.VITE_PUBLIC_SITE_ORIGIN || "https://eoringo.pages.dev"
).replace(/\/+$/, "");
const expectedAdsText = normalizeText(
  await readFile(join(projectRoot, "public", "ads.txt"), "utf8"),
);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const fetchPublicAsset = async (path) => {
  const url = `${siteOrigin}${path}`;
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "eoringo-public-asset-check/1.0" },
  });
  const body = normalizeText(await response.text());

  assert(response.status === 200, `${url} returned HTTP ${response.status}.`);
  assert(!response.headers.get("location"), `${url} must not redirect.`);

  return { body, contentType: response.headers.get("content-type") ?? "", url };
};

const ads = await fetchPublicAsset("/ads.txt");
assert(ads.body === expectedAdsText, `${ads.url} does not match public/ads.txt.`);
assert(/^text\/plain\b/i.test(ads.contentType), `${ads.url} must be served as text/plain.`);

const robots = await fetchPublicAsset("/robots.txt");
assert(/^text\/plain\b/i.test(robots.contentType), `${robots.url} must be served as text/plain.`);
assert(robots.body.includes("Sitemap:"), `${robots.url} must publish a sitemap URL.`);

const sitemap = await fetchPublicAsset("/sitemap.xml");
assert(/application\/xml|text\/xml/i.test(sitemap.contentType), `${sitemap.url} must be served as XML.`);
assert(/<urlset[\s>]/.test(sitemap.body), `${sitemap.url} must contain a sitemap urlset.`);

console.log(`Public deployment verification passed for ${siteOrigin}.`);
