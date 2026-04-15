import { supabase } from "../supabaseClient";

export type PlaylistInviteDecision = "accept" | "decline";

export async function respondToPlaylistInvite(
  notificationId: string,
  decision: PlaylistInviteDecision
): Promise<void> {
  const { error } = await supabase.rpc("respond_to_playlist_invite", {
    p_notification_id: notificationId,
    p_decision: decision,
  });

  if (error) {
    throw error;
  }
}
