import { describe, expect, it, vi } from "vitest";
import { touchGuestAccountActivity } from "./guestActivity";

describe("guest account activity", () => {
  it("touches only the current guest identity through the protected RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });

    await expect(
      touchGuestAccountActivity(() => Promise.resolve({ rpc }), "guest-id"),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith("touch_guest_account_activity", {
      p_user_id: "guest-id",
    });
  });

  it("does not fail local-only mode when no Supabase client exists", async () => {
    await expect(touchGuestAccountActivity(() => Promise.resolve(null), "guest-id")).resolves.toBe(
      false,
    );
  });

  it("surfaces server errors to the caller for diagnostics", async () => {
    const error = new Error("activity_unavailable");
    const rpc = vi.fn().mockResolvedValue({ error });

    await expect(
      touchGuestAccountActivity(() => Promise.resolve({ rpc }), "guest-id"),
    ).rejects.toBe(error);
  });
});
