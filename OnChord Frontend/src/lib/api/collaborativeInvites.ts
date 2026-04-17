import { supabase } from "../supabaseClient";

export type PlaylistInviteDecision = "accept" | "decline";

const isInviteAlreadyResolvedError = (error: any): boolean => {
  if (!error) return false;

  const message = String(error.message || "").toLowerCase();
  const details = String(error.details || "").toLowerCase();
  const serialized = (() => {
    try {
      return JSON.stringify(error).toLowerCase();
    } catch {
      return "";
    }
  })();

  return (
    error.status === 409 ||
    error.statusCode === 409 ||
    error.code === "409" ||
    error.code === "23505" ||
    message.includes("invite not found") ||
    message.includes("already") ||
    message.includes("duplicate") ||
    details.includes("duplicate") ||
    serialized.includes('"status":409') ||
    serialized.includes("23505")
  );
};

export async function respondToPlaylistInvite(
  notificationId: string,
  decision: PlaylistInviteDecision
): Promise<void> {
  const { error } = await supabase.rpc("respond_to_playlist_invite", {
    p_notification_id: notificationId,
    p_decision: decision,
  });

  if (error) {
    if (isInviteAlreadyResolvedError(error)) {
      return;
    }
    throw error;
  }
}
