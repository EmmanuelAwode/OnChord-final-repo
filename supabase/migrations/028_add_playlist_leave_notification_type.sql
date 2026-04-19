-- Add support for playlist_leave notifications used when a collaborator leaves a playlist.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'playlist_add', 'playlist_invite', 'playlist_leave'));
