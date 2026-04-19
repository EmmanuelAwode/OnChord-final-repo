-- Allow a collaborator to leave a playlist cleanly and notify the creator.

CREATE OR REPLACE FUNCTION public.leave_collaborative_playlist(p_playlist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  creator_user_id uuid;
  playlist_title text := 'a playlist';
  removed_from_membership boolean := false;
  rows_deleted integer := 0;
  user_name text := 'A user';
  user_avatar text := NULL;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  removed_from_membership := EXISTS (
    SELECT 1
    FROM public.collaborative_playlists cp
    WHERE cp.id = p_playlist_id
  );

  IF removed_from_membership THEN
    BEGIN
      creator_user_id := (
        SELECT cp.creator_id
        FROM public.collaborative_playlists cp
        WHERE cp.id = p_playlist_id
        LIMIT 1
      );
    EXCEPTION WHEN undefined_column THEN
      creator_user_id := (
        SELECT cp.created_by
        FROM public.collaborative_playlists cp
        WHERE cp.id = p_playlist_id
        LIMIT 1
      );
    END;

    BEGIN
      playlist_title := COALESCE(
        (
          SELECT cp.name
          FROM public.collaborative_playlists cp
          WHERE cp.id = p_playlist_id
          LIMIT 1
        ),
        'a playlist'
      );
    EXCEPTION WHEN undefined_column THEN
      playlist_title := COALESCE(
        (
          SELECT cp.title
          FROM public.collaborative_playlists cp
          WHERE cp.id = p_playlist_id
          LIMIT 1
        ),
        'a playlist'
      );
    END;
  ELSE
    creator_user_id := (
      SELECT p.creator_id
      FROM public.playlists p
      WHERE p.id = p_playlist_id
      LIMIT 1
    );

    playlist_title := COALESCE(
      (
        SELECT p.name
        FROM public.playlists p
        WHERE p.id = p_playlist_id
        LIMIT 1
      ),
      'a playlist'
    );
  END IF;

  user_name := COALESCE(
    (
      SELECT COALESCE(pr.display_name, pr.username, 'A user')
      FROM public.profiles pr
      WHERE pr.id = current_user_id
      LIMIT 1
    ),
    'A user'
  );

  user_avatar := (
    SELECT pr.avatar_url
    FROM public.profiles pr
    WHERE pr.id = current_user_id
    LIMIT 1
  );

  DELETE FROM public.playlist_collaborators
  WHERE playlist_id = p_playlist_id
    AND user_id = current_user_id;
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  removed_from_membership := rows_deleted > 0;

  DELETE FROM public.playlist_contributors
  WHERE playlist_id = p_playlist_id
    AND user_id = current_user_id;

  UPDATE public.playlists
  SET collaborators = array_remove(COALESCE(collaborators, '{}'), current_user_id)
  WHERE id = p_playlist_id;

  IF creator_user_id IS NOT NULL AND creator_user_id <> current_user_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_user_id,
      action_user_name,
      action_user_avatar,
      playlist_id,
      is_read
    ) VALUES (
      creator_user_id,
      'playlist_leave',
      'Contributor left playlist',
      user_name || ' left "' || playlist_title || '".',
      current_user_id::text,
      user_name,
      user_avatar,
      p_playlist_id::text,
      false
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'removed', removed_from_membership,
    'playlist_id', p_playlist_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_collaborative_playlist(uuid) TO authenticated;
