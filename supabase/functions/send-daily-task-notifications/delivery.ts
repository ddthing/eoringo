import { withTimeout } from "../_shared/asyncControl.ts";

export type PushDeliveryResult = "sent" | "removed" | "failed" | "already_claimed";

type PushDeliveryOptions = {
  claim: () => Promise<boolean>;
  send: () => Promise<void>;
  finalize: () => Promise<void>;
  markFailure: () => Promise<void>;
  remove: () => Promise<void>;
  getStatusCode: (error: unknown) => number | null;
  timeoutMs?: number;
};

export const deliverPushNotification = async ({
  claim,
  send,
  finalize,
  markFailure,
  remove,
  getStatusCode,
  timeoutMs = 8_000,
}: PushDeliveryOptions): Promise<PushDeliveryResult> => {
  let claimed: boolean;

  try {
    claimed = await withTimeout(claim, timeoutMs, "push_claim");
  } catch {
    return "failed";
  }

  if (!claimed) {
    return "already_claimed";
  }

  try {
    await withTimeout(send, timeoutMs, "push_send");
    await withTimeout(finalize, timeoutMs, "push_finalize");
    return "sent";
  } catch (error) {
    const statusCode = getStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      try {
        await withTimeout(remove, timeoutMs, "push_remove");
        return "removed";
      } catch {
        // Fall through and retain the subscription with a delivery error.
      }
    }

    try {
      await withTimeout(markFailure, timeoutMs, "push_failure_record");
    } catch {
      // The caller still needs the failed result if the error state cannot be stored.
    }

    return "failed";
  }
};
