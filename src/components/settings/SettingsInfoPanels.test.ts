import { describe, expect, it } from "vitest";
import { getBackgroundPushStatusMessage } from "./SettingsInfoPanels";

describe("background push status copy", () => {
  it("explains that a stale snapshot is being synchronized", () => {
    expect(
      getBackgroundPushStatusMessage({
        registered: true,
        enabled: true,
        lastError: "stale_task_summary",
        updatedAt: "2026-08-16T05:00:00.000Z",
      }),
    ).toContain("동기화하는 중");
  });

  it("does not expose internal error names for unknown failures", () => {
    const message = getBackgroundPushStatusMessage({
      registered: true,
      enabled: true,
      lastError: "delivery_finalize_rejected",
      updatedAt: "2026-08-16T05:00:00.000Z",
    });

    expect(message).not.toContain("delivery_finalize_rejected");
    expect(message).toContain("잠시 후");
  });

  it("asks the user to resync when the server has no registration", () => {
    expect(getBackgroundPushStatusMessage({ registered: false })).toContain("다시 열면");
  });
});
