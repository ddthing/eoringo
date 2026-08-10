import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CharacterImageEditor,
  IMAGE_LOAD_ERROR_MESSAGE,
} from "./CharacterImageEditor";

describe("CharacterImageEditor", () => {
  it("keeps the editor dialog available when no document body exists", () => {
    const markup = renderToStaticMarkup(
      <CharacterImageEditor
        file={{} as File}
        isSaving={false}
        onCancel={vi.fn()}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("z-[80]");
  });

  it("uses a user-facing message when an image cannot be decoded", () => {
    expect(IMAGE_LOAD_ERROR_MESSAGE).toContain("이미지를 불러오지 못했습니다");
  });
});
