import { describe, expect, it } from "vitest";
import { parseWebPushPublicKey } from "./pushConfig";

describe("parseWebPushPublicKey", () => {
  it("accepts a base64url VAPID public key", () => {
    expect(parseWebPushPublicKey("A".repeat(87))).toHaveLength(87);
  });

  it.each(["", "not base64", "A".repeat(79), "A".repeat(129)])(
    "rejects an invalid public key (%s)",
    (value) => {
      expect(parseWebPushPublicKey(value)).toBeNull();
    },
  );
});
