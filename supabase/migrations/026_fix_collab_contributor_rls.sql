-- Fix collaborative playlist membership write permissions for creator-managed edits.
--
-- Symptoms fixed:
-- - 403 errors when creator saves contributor changes.
-- - contributor removals not persisting due missing/legacy policies.

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

GRANT EXECUTE ON FUNCTION public.is_collab_playlist_owner(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_collab_playlist_admin(uuid) TO authenticated, anon;

ALTER TABLE IF EXISTS public.playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.playlist_contributors ENABLE ROW LEVEL SECURITY;

-- Allow creators/admins to add or edit collaborator rows without relying on recursive policy paths.
DROP POLICY IF EXISTS "collaborators_insert" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_non_recursive" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "collaborators_update_non_recursive" ON public.playlist_collaborators;

CREATE POLICY "collaborators_insert_non_recursive" ON public.playlist_collaborators
  FOR INSERT
  WITH CHECK (public.is_collab_playlist_admin(playlist_id));

CREATE POLICY "collaborators_update_non_recursive" ON public.playlist_collaborators
  FOR UPDATE
  USING (public.is_collab_playlist_admin(playlist_id))
  WITH CHECK (public.is_collab_playlist_admin(playlist_id));

-- Ensure contributor membership mirror table has explicit write policies.
DROP POLICY IF EXISTS "Creators can add contributors" ON public.playlist_contributors;
DROP POLICY IF EXISTS "playlist_contributors_insert_non_recursive" ON public.playlist_contributors;
DROP POLICY IF EXISTS "playlist_contributors_update_non_recursive" ON public.playlist_contributors;
DROP POLICY IF EXISTS "playlist_contributors_delete_non_recursive" ON public.playlist_contributors;

CREATE POLICY "playlist_contributors_insert_non_recursive" ON public.playlist_contributors
  FOR INSERT
  WITH CHECK (public.is_collab_playlist_admin(playlist_id));

CREATE POLICY "playlist_contributors_update_non_recursive" ON public.playlist_contributors
  FOR UPDATE
  USING (public.is_collab_playlist_admin(playlist_id))
  WITH CHECK (public.is_collab_playlist_admin(playlist_id));

CREATE POLICY "playlist_contributors_delete_non_recursive" ON public.playlist_contributors
  FOR DELETE
  USING (user_id = auth.uid() OR public.is_collab_playlist_admin(playlist_id));
