import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("deployed browser security policy", () => {
  it("ships restrictive Cloudflare Pages headers", () => {
    const headers = readFileSync(resolve(process.cwd(), "public", "_headers"), "utf8");

    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).toContain("object-src 'none'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("Strict-Transport-Security:");
    expect(headers).toContain("Permissions-Policy:");
  });

  it("keeps theme bootstrap same-origin so script CSP does not need unsafe-inline", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('<script src="/theme-preload.js"></script>');
    expect(html).not.toContain("<script>\n      (() => {");
  });
});
