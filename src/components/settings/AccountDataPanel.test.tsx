import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDataPanel } from "./AccountDataPanel";
import { AppInfoPanel, NotificationSettingsPanel } from "./SettingsInfoPanels";
import { ThemeSettingsPanel } from "./ThemeSettingsPanel";

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    status: "disabled",
    mode: "local",
    userId: null,
    errorCode: null,
    connectGoogle: vi.fn(),
    createGuest: vi.fn(),
    retry: vi.fn(),
  }),
}));

vi.mock("../common/ConfirmDialog", () => ({
  useConfirmDialog: () => vi.fn(async () => false),
}));

vi.mock("../sync/SyncStatus", () => ({
  SyncStatus: () => null,
}));

vi.mock("../../stores/useThemeStore", () => ({
  useThemeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      themeColorId: "mint",
      customAccentColor: "#8FC88A",
      appearanceMode: "system",
      setThemeColor: vi.fn(),
      setCustomAccentColor: vi.fn(),
      setAppearanceMode: vi.fn(),
    }),
}));

describe("AccountDataPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders account, backup, and reset controls inside one card", () => {
    const markup = renderToStaticMarkup(<AccountDataPanel />);

    expect(markup).toContain('class="ui-card overflow-hidden p-0"');
    expect(markup).toContain('data-variant="outlined"');
    expect(markup).toContain('id="backup"');
    expect(markup).toContain('id="data"');
    expect(markup).toContain("이 기기에서만 저장 중");
    expect(markup).toContain("백업 및 복원");
    expect(markup.match(/백업 및 복원/g)).toHaveLength(1);
    expect(markup).toContain("모든 데이터 초기화");
    expect(markup).not.toContain('class="card space-y-3"');
    expect(markup).not.toContain('class="card space-y-4"');
  });

  it("keeps credits and contact in app info without duplicating storage guidance", () => {
    const markup = renderToStaticMarkup(<AppInfoPanel />);

    expect(markup).toContain("Thanks to");
    expect(markup.match(/Credits/g)).toHaveLength(1);
    expect(markup).toContain("문의하기");
    expect(markup).not.toContain("데이터는 직접 백업하거나 초기화하기 전까지");
  });

  it("gives design, notification, and app info cards the same inner spacing", () => {
    expect(renderToStaticMarkup(<ThemeSettingsPanel />)).toContain(
      'class="ui-card space-y-4 p-4"',
    );
    expect(renderToStaticMarkup(<NotificationSettingsPanel />)).toContain(
      'class="ui-card space-y-3 p-4"',
    );
    expect(renderToStaticMarkup(<AppInfoPanel />)).toContain('class="ui-card space-y-3 p-4"');
  });
});
