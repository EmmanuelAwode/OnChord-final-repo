-- Fix recursive RLS policies that trigger 42P17 on collaborative playlist queries.
--
-- Root cause:
-- - SELECT policies on playlist_collaborators/playlist_contributors queried the same table.
-- - collaborative_playlists SELECT also depended on those policies.
-- This created policy evaluation loops (infinite recursion).

-- Helper: true when current user can access a collaborative playlist.
CREATE OR REPLACE FUNCTION public.is_collab_playlist_member(target_playlist_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.collaborative_playlists cp
        WHERE cp.id = target_playlist_id
          AND (
            cp.is_public = true
            OR cp.creator_id = auth.uid()
            OR cp.created_by = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.playlist_collaborators pc
        WHERE pc.playlist_id = target_playlist_id
          AND pc.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.playlist_contributors pco
        WHERE pco.playlist_id = target_playlist_id
          AND pco.user_id = auth.uid()
      )
    );
$$;

-- Helper: true when current user is the playlist owner/creator.
CREATE OR REPLACE FUNCTION public.is_collab_playlist_owner(target_playlist_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.collaborative_playlists cp
      WHERE cp.id = target_playlist_id
        AND (
          cp.creator_id = auth.uid()
          OR cp.created_by = auth.uid()
        )
    );
$$;

-- Helper: true when current user can admin collaborators for playlist.
CREATE OR REPLACE FUNCTION public.is_collab_playlist_admin(target_playlist_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.is_collab_playlist_owner(target_playlist_id)
      OR EXISTS (
        SELECT 1
        FROM public.playlist_collaborators pc
        WHERE pc.playlist_id = target_playlist_id
          AND pc.user_id = auth.uid()
          AND pc.role IN ('owner', 'admin')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_collab_playlist_member(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_collab_playlist_owner(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_collab_playlist_admin(uuid) TO authenticated, anon;

-- Replace recursive collaborative_playlists SELECT policies.
DO $$
BEGIN
  IF to_regclass('public.collaborative_playlists') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "playlists_select" ON public.collaborative_playlists';
    EXECUTE 'DROP POLICY IF EXISTS "Contributors can view their playlists" ON public.collaborative_playlists';
    EXECUTE 'DROP POLICY IF EXISTS "playlists_select_non_recursive" ON public.collaborative_playlists';

    EXECUTE 'CREATE POLICY "playlists_select_non_recursive" ON public.collaborative_playlists FOR SELECT USING (public.is_collab_playlist_member(id))';
  END IF;
END $$;

-- Replace recursive playlist_collaborators SELECT/DELETE policies.
DO $$
BEGIN
  IF to_regclass('public.playlist_collaborators') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "collaborators_select" ON public.playlist_collaborators';
    EXECUTE 'DROP POLICY IF EXISTS "collaborators_select_non_recursive" ON public.playlist_collaborators';

    EXECUTE 'CREATE POLICY "collaborators_select_non_recursive" ON public.playlist_collaborators FOR SELECT USING (public.is_collab_playlist_member(playlist_id))';

    EXECUTE 'DROP POLICY IF EXISTS "collaborators_delete" ON public.playlist_collaborators';
    EXECUTE 'DROP POLICY IF EXISTS "collaborators_delete_non_recursive" ON public.playlist_collaborators';

    EXECUTE ''
      || 'CREATE POLICY "collaborators_delete_non_recursive" ON public.playlist_collaborators '
      || 'FOR DELETE USING (user_id = auth.uid() OR public.is_collab_playlist_admin(playlist_id))';
  END IF;
END $$;

-- Replace recursive playlist_contributors SELECT policy.
DO $$
BEGIN
  IF to_regclass('public.playlist_contributors') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Contributors can view playlist members" ON public.playlist_contributors';
    EXECUTE 'DROP POLICY IF EXISTS "playlist_contributors_select_non_recursive" ON public.playlist_contributors';

    EXECUTE 'CREATE POLICY "playlist_contributors_select_non_recursive" ON public.playlist_contributors FOR SELECT USING (public.is_collab_playlist_member(playlist_id))';
  END IF;
END $$;
