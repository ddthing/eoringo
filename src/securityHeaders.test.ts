import { createHash } from "node:crypto";
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

  it("keeps the theme bootstrap CSP-hashed without enabling unsafe-inline scripts", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const headers = readFileSync(resolve(process.cwd(), "public", "_headers"), "utf8");
    const scriptStart = html.indexOf("<script>") + "<script>".length;
    const scriptEnd = html.indexOf("</script>", scriptStart);
    const script = html.slice(scriptStart, scriptEnd);
    const scriptHash = `sha256-${createHash("sha256").update(script).digest("base64")}`;

    expect(html).toContain("<script>\n      (() => {");
    expect(scriptEnd).toBeGreaterThan(scriptStart);
    expect(headers).toContain(`'${scriptHash}'`);
    expect(headers).toMatch(/script-src[^;]*'sha256-[A-Za-z0-9+/]{43}='/);
    expect(headers).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });
});
