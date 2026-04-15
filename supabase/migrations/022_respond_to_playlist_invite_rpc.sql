-- SECURITY DEFINER RPC to accept or decline playlist invites without relying on recursive RLS paths.

CREATE OR REPLACE FUNCTION public.respond_to_playlist_invite(
  p_notification_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_row public.notifications%ROWTYPE;
  resolved_playlist_id uuid;
  normalized_decision text := lower(trim(coalesce(p_decision, '')));
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO invite_row
  FROM public.notifications
  WHERE id = p_notification_id
    AND user_id = current_user_id
    AND type = 'playlist_invite'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_row.playlist_id IS NULL OR invite_row.playlist_id = '' THEN
    RAISE EXCEPTION 'Invite is missing a playlist id';
  END IF;

  resolved_playlist_id := invite_row.playlist_id::uuid;

  IF normalized_decision = 'accept' THEN
    INSERT INTO public.playlist_collaborators (playlist_id, user_id, role, invited_by)
    VALUES (
      resolved_playlist_id,
      current_user_id,
      'contributor',
      CASE
        WHEN invite_row.action_user_id ~* '^[0-9a-f-]{36}$' THEN invite_row.action_user_id::uuid
        ELSE NULL
      END
    )
    ON CONFLICT (playlist_id, user_id)
    DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.playlists
    SET collaborators = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(COALESCE(collaborators, '{}') || ARRAY[current_user_id])
      )
    )
    WHERE id = resolved_playlist_id;
  ELSIF normalized_decision = 'decline' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  DELETE FROM public.notifications
  WHERE id = p_notification_id
    AND user_id = current_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'decision', normalized_decision,
    'playlist_id', invite_row.playlist_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_playlist_invite(uuid, text) TO authenticated;
