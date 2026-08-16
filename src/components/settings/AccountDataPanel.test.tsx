import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountDataPanel } from "./AccountDataPanel";
import {
  AppInfoPanel,
  getBackgroundPushGuidance,
  NotificationSettingsPanel,
} from "./SettingsInfoPanels";
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
    expect(markup).toContain('data-variant="elevated"');
    expect(markup).toContain('id="backup"');
    expect(markup).toContain('id="data"');
    expect(markup).toContain("이 기기에서만 저장 중");
    expect(markup).toContain("백업 및 복원");
    expect(markup.match(/백업 및 복원/g)).toHaveLength(1);
    expect(markup).toContain("모든 데이터 초기화");
    expect(markup.match(/class="ui-card/g)).toHaveLength(1);
    expect(markup).not.toContain('class="card space-y-3"');
    expect(markup).not.toContain('class="card space-y-4"');
  });

  it("keeps credits and contact in app info without duplicating storage guidance", () => {
    const markup = renderToStaticMarkup(<AppInfoPanel />);

    expect(markup).toContain("도움을 주신 분들");
    expect(markup.match(/크레딧/g)).toHaveLength(1);
    expect(markup).toContain('href="/privacy"');
    expect(markup).toContain('href="/terms"');
    expect(markup).not.toContain('data-variant="success"');
    expect(markup).toContain("문의하기");
    expect(markup).not.toContain("데이터는 직접 백업하거나 초기화하기 전까지");
  });

  it("uses one status icon for notification guidance", () => {
    const markup = renderToStaticMarkup(<NotificationSettingsPanel />);

    expect(markup.match(/lucide-info/g)).toHaveLength(1);
    expect(markup.match(/lucide-bell/g)).toHaveLength(1);
  });

  it("exposes the background notification toggle and schedule control", () => {
    const markup = renderToStaticMarkup(<NotificationSettingsPanel />);

    expect(markup).toContain("앱이 닫혀도 미완료 숙제 알림");
    expect(markup).toContain('id="daily-incomplete-notification-time"');
    expect(markup).toContain("notification-time-field");
    expect(markup).toContain("notification-time-control");
    expect(markup).toContain("notification-time-input");
    expect(markup).toContain("한국 시간 기준");
    expect(markup).not.toContain("HTTPS 배포");
    expect(markup).not.toContain("VAPID");
  });

  it("translates background notification prerequisites into user-facing guidance", () => {
    expect(
      getBackgroundPushGuidance({
        authMode: "guest",
        hasUserId: true,
        remoteSyncEnabled: true,
        hasPublicKey: true,
        browserSupported: true,
      }),
    ).toBe("앱을 닫은 뒤에도 알림을 받으려면 Google 계정을 연결해 주세요.");

    expect(
      getBackgroundPushGuidance({
        authMode: "permanent",
        hasUserId: true,
        remoteSyncEnabled: false,
        hasPublicKey: false,
        browserSupported: true,
      }),
    ).toBe("앱을 닫은 뒤 알림은 아직 이 환경에서 사용할 수 없어요.");

    expect(
      getBackgroundPushGuidance({
        authMode: "permanent",
        hasUserId: true,
        remoteSyncEnabled: true,
        hasPublicKey: true,
        browserSupported: false,
      }),
    ).toBe("현재 브라우저에서는 앱을 닫은 뒤 알림을 지원하지 않아요.");

    expect(
      getBackgroundPushGuidance({
        authMode: "permanent",
        hasUserId: true,
        remoteSyncEnabled: true,
        hasPublicKey: true,
        browserSupported: true,
      }),
    ).toBeNull();
  });

  it("gives design, notification, and app info cards the same inner spacing", () => {
    expect(renderToStaticMarkup(<ThemeSettingsPanel />)).toContain(
      'class="ui-card space-y-4 p-5"',
    );
    expect(renderToStaticMarkup(<NotificationSettingsPanel />)).toContain(
      'class="ui-card space-y-4 p-5"',
    );
    expect(renderToStaticMarkup(<AppInfoPanel />)).toContain('class="ui-card space-y-4 p-5"');
  });

  it("keeps theme choices away from their borders", () => {
    const markup = renderToStaticMarkup(<ThemeSettingsPanel />);

    expect(markup).toContain(
      "min-h-14 min-w-0 w-full items-center gap-3 rounded-ui-md border bg-card/88 px-4 py-3",
    );
  });
});
