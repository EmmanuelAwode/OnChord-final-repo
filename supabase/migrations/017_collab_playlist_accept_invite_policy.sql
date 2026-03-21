-- Migration: Allow users to accept playlist invites
-- Adds an RLS policy so an invited user can insert themselves
-- into playlist_collaborators when responding to a playlist_invite notification.

-- Drop the policy if a previous run exists
DROP POLICY IF EXISTS "collaborators_insert_accept_invite" ON public.playlist_collaborators;

CREATE POLICY "collaborators_insert_accept_invite" ON public.playlist_collaborators
  FOR INSERT
  WITH CHECK (
    -- The row being inserted is for the current user themselves …
    user_id = auth.uid()
    -- … and there exists an unread playlist_invite notification for them
    AND EXISTS (
      SELECT 1
      FROM public.notifications
      WHERE notifications.user_id     = auth.uid()
        AND notifications.type        = 'playlist_invite'
        AND notifications.playlist_id = playlist_collaborators.playlist_id
    )
  );
