import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeLegalLinks } from "./HomeLegalLinks";

describe("HomeLegalLinks", () => {
  it("exposes same-origin privacy and terms links on the public homepage", () => {
    const markup = renderToStaticMarkup(<HomeLegalLinks />);

    expect(markup).toContain('aria-label="법적 안내"');
    expect(markup).toContain('href="/guide"');
    expect(markup).toContain('href="/about"');
    expect(markup).toContain('href="/demo"');
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
    expect(markup).not.toContain("supabase.co");
  });
});
