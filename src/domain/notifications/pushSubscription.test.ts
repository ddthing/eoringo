import { describe, expect, it } from "vitest";
import {
  decodeApplicationServerKey,
  normalizePushSubscription,
  serializePushSubscription,
} from "./pushSubscription";

const validSubscription = {
  endpoint: "https://push.example.test/send/abc",
  expirationTime: null,
  keys: {
    p256dh: "BAbcdefghijklmnopABCDEFGHIJKLMNOPQRSTUVWX",
    auth: "abcdefghijklmnop",
  },
};

describe("push subscription boundary", () => {
  it("keeps only the fields required by the server", () => {
    expect(
      normalizePushSubscription({
        ...validSubscription,
        unexpected: "discarded",
      }),
    ).toEqual(validSubscription);
  });

  it("rejects incomplete or non-https subscriptions", () => {
    expect(normalizePushSubscription({ ...validSubscription, endpoint: "http://unsafe.test" })).toBeNull();
    expect(
      normalizePushSubscription({
        ...validSubscription,
        keys: { auth: validSubscription.keys.auth },
      }),
    ).toBeNull();
  });

  it("decodes the base64url VAPID key for PushManager", () => {
    expect(Array.from(decodeApplicationServerKey("AQID"))).toEqual([1, 2, 3]);
  });

  it("serializes the browser object before sending it to the server", () => {
    expect(
      serializePushSubscription({
        toJSON: () => ({ ...validSubscription, browserOnly: true }),
      } as unknown as PushSubscription),
    ).toEqual(validSubscription);
  });
});
