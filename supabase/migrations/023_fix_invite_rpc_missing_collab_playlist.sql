-- Fix invite acceptance when notification.playlist_id points to a legacy playlist
-- row that is missing from collaborative_playlists.

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

  legacy_playlist jsonb;
  playlist_title text;
  playlist_description text;
  playlist_cover text;
  owner_user_id uuid := current_user_id;
  owner_user_id_text text;
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
    -- Ensure collaborative playlist row exists, even if the invite references
    -- a legacy playlists.id that was never mirrored.
    IF NOT EXISTS (
      SELECT 1
      FROM public.collaborative_playlists cp
      WHERE cp.id = resolved_playlist_id
    ) THEN
      SELECT to_jsonb(p)
      INTO legacy_playlist
      FROM public.playlists p
      WHERE p.id = resolved_playlist_id
      LIMIT 1;

      IF legacy_playlist IS NOT NULL THEN
        playlist_title := coalesce(
          legacy_playlist ->> 'title',
          legacy_playlist ->> 'name',
          'Collaborative Playlist'
        );
        playlist_description := coalesce(
          legacy_playlist ->> 'description',
          'A collaborative playlist'
        );
        playlist_cover := coalesce(
          legacy_playlist ->> 'cover_url',
          legacy_playlist ->> 'cover_image'
        );

        owner_user_id_text := nullif(trim(coalesce(
          legacy_playlist ->> 'creator_id',
          legacy_playlist ->> 'created_by',
          invite_row.action_user_id
        )), '');

        IF owner_user_id_text IS NOT NULL AND owner_user_id_text ~* '^[0-9a-f-]{36}$' THEN
          BEGIN
            owner_user_id := owner_user_id_text::uuid;
          EXCEPTION WHEN invalid_text_representation THEN
            owner_user_id := current_user_id;
          END;
        ELSE
          owner_user_id := current_user_id;
        END IF;

        IF owner_user_id IS NULL THEN
          owner_user_id := current_user_id;
        END IF;

        IF owner_user_id IS NULL THEN
          RAISE EXCEPTION 'Unable to determine playlist owner for invite %', p_notification_id;
        END IF;

        -- Newer schema variant (name/cover_image/creator_id/is_public).
        BEGIN
          INSERT INTO public.collaborative_playlists (
            id,
            name,
            description,
            cover_image,
            creator_id,
            is_public
          )
          VALUES (
            resolved_playlist_id,
            playlist_title,
            playlist_description,
            playlist_cover,
            owner_user_id,
            false
          )
          ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN undefined_column THEN
          -- Older schema variant (title/cover_url/created_by).
          INSERT INTO public.collaborative_playlists (
            id,
            title,
            description,
            cover_url,
            created_by
          )
          VALUES (
            resolved_playlist_id,
            playlist_title,
            playlist_description,
            playlist_cover,
            owner_user_id
          )
          ON CONFLICT (id) DO NOTHING;
        END;

        INSERT INTO public.playlist_collaborators (playlist_id, user_id, role, invited_by)
        VALUES (resolved_playlist_id, owner_user_id, 'owner', NULL)
        ON CONFLICT (playlist_id, user_id) DO NOTHING;

        -- Keep legacy contributor table in sync where it exists.
        BEGIN
          INSERT INTO public.playlist_contributors (playlist_id, user_id)
          VALUES (resolved_playlist_id, owner_user_id)
          ON CONFLICT (playlist_id, user_id) DO NOTHING;
        EXCEPTION WHEN undefined_table THEN
          NULL;
        END;
      ELSE
        -- Invite points to a playlist that no longer exists in either table.
        -- Expire it so the user can continue without repeated failures.
        DELETE FROM public.notifications
        WHERE id = p_notification_id
          AND user_id = current_user_id;

        RETURN jsonb_build_object(
          'ok', true,
          'decision', 'expired',
          'playlist_id', invite_row.playlist_id,
          'reason', 'playlist_not_found'
        );
      END IF;
    END IF;

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

    BEGIN
      INSERT INTO public.playlist_contributors (playlist_id, user_id)
      VALUES (resolved_playlist_id, current_user_id)
      ON CONFLICT (playlist_id, user_id) DO NOTHING;
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;

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
