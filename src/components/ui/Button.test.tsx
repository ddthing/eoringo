import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button loading state", () => {
  it("keeps the original layout as a hidden placeholder and exposes the loading label", () => {
    const markup = renderToStaticMarkup(
      <Button loading loadingLabel="저장 중">
        저장
      </Button>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-label="저장 중"');
    expect(markup).toContain("ui-button-loading-placeholder");
    expect(markup).toContain("ui-button-loading-indicator");
    expect(markup).toContain('disabled=""');
  });
});
