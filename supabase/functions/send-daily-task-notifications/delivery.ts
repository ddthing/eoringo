export type PushDeliveryResult = "sent" | "removed" | "failed" | "already_claimed";

type PushDeliveryOptions = {
  claim: () => Promise<boolean>;
  send: () => Promise<void>;
  finalize: () => Promise<void>;
  markFailure: () => Promise<void>;
  remove: () => Promise<void>;
  getStatusCode: (error: unknown) => number | null;
};

export const deliverPushNotification = async ({
  claim,
  send,
  finalize,
  markFailure,
  remove,
  getStatusCode,
}: PushDeliveryOptions): Promise<PushDeliveryResult> => {
  let claimed: boolean;

  try {
    claimed = await claim();
  } catch {
    return "failed";
  }

  if (!claimed) {
    return "already_claimed";
  }

  try {
    await send();
    await finalize();
    return "sent";
  } catch (error) {
    const statusCode = getStatusCode(error);

    if (statusCode === 404 || statusCode === 410) {
      try {
        await remove();
        return "removed";
      } catch {
        // Fall through and retain the subscription with a delivery error.
      }
    }

    try {
      await markFailure();
    } catch {
      // The caller still needs the failed result if the error state cannot be stored.
    }

    return "failed";
  }
};
