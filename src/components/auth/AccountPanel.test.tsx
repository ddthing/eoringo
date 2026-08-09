import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./AccountPanel";

const authState = {
  status: "guest" as const,
  mode: "guest" as const,
  userId: "guest-id",
  provider: "anonymous" as const,
  errorCode: null,
  createGuest: vi.fn(),
  connectGoogle: vi.fn(),
  completeOAuthCallback: vi.fn(),
  retry: vi.fn(),
};

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("../sync/SyncStatus", () => ({
  SyncStatus: () => null,
}));

describe("AccountPanel", () => {
  it("shows Google connection after guest creation", () => {
    const markup = renderToStaticMarkup(<AccountPanel embedded />);

    expect(markup).toContain("Google");
    expect(markup).toContain('type="button"');
  });
});
