import { describe, expect, it, vi } from "vitest";
import { deliverPushNotification } from "./delivery";

describe("push delivery finalization", () => {
  it("does not report success when delivery state persistence fails", async () => {
    const claim = vi.fn(async () => true);
    const send = vi.fn(async () => undefined);
    const finalize = vi.fn(async () => {
      throw new Error("delivery_state_persist_failed");
    });
    const markFailure = vi.fn(async () => undefined);

    const result = await deliverPushNotification({
      claim,
      send,
      finalize,
      markFailure,
      remove: vi.fn(async () => undefined),
      getStatusCode: () => null,
    });

    expect(send).toHaveBeenCalledOnce();
    expect(finalize).toHaveBeenCalledOnce();
    expect(markFailure).toHaveBeenCalledOnce();
    expect(result).toBe("failed");
  });

  it("does not send when another worker owns the active delivery lease", async () => {
    const claim = vi.fn(async () => false);
    const send = vi.fn(async () => undefined);

    const result = await deliverPushNotification({
      claim,
      send,
      finalize: vi.fn(async () => undefined),
      markFailure: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      getStatusCode: () => null,
    });

    expect(claim).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
    expect(result).toBe("already_claimed");
  });
});
