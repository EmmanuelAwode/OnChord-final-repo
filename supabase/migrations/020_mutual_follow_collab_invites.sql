-- Enforce mutual-follow requirements for collaborative playlist invites
-- 1) Invite rows can be inserted only for mutual follows.
-- 2) Invite acceptance can insert collaborator rows only when follow is mutual.

-- Restrict playlist_invite notifications to mutual-follow relationships.
DROP POLICY IF EXISTS "playlist_invites_require_mutual_follow" ON public.notifications;

CREATE POLICY "playlist_invites_require_mutual_follow"
AS RESTRICTIVE
ON public.notifications
FOR INSERT
WITH CHECK (
  type <> 'playlist_invite'
  OR (
    action_user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.follows outgoing_follow
      WHERE outgoing_follow.follower_id = auth.uid()
        AND outgoing_follow.following_id = notifications.user_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.follows incoming_follow
      WHERE incoming_follow.follower_id = notifications.user_id
        AND incoming_follow.following_id = auth.uid()
    )
  )
);

-- Tighten invite acceptance policy: unread invite must exist and inviter relationship must be mutual.
DROP POLICY IF EXISTS "collaborators_insert_accept_invite" ON public.playlist_collaborators;

CREATE POLICY "collaborators_insert_accept_invite" ON public.playlist_collaborators
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = auth.uid()
        AND n.type = 'playlist_invite'
        AND n.is_read = false
        AND n.playlist_id = playlist_collaborators.playlist_id::text
        AND n.action_user_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.follows f1
          WHERE f1.follower_id = auth.uid()
            AND f1.following_id::text = n.action_user_id
        )
        AND EXISTS (
          SELECT 1
          FROM public.follows f2
          WHERE f2.following_id = auth.uid()
            AND f2.follower_id::text = n.action_user_id
        )
    )
  );
