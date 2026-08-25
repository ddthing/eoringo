import type { SupabaseClient } from "@supabase/supabase-js";

export const guestActivityTouchIntervalMs = 24 * 60 * 60 * 1000;

type GuestActivityClient = Pick<SupabaseClient, "rpc">;

export const touchGuestAccountActivity = async (
  getClient: () => Promise<GuestActivityClient | null>,
  userId: string,
) => {
  if (!userId) {
    return false;
  }

  const client = await getClient();

  if (!client) {
    return false;
  }

  const { error } = await client.rpc("touch_guest_account_activity", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return true;
};
