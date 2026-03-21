-- Migration: Add visibility column to reviews
-- Replaces the simple is_public boolean with a 3-way visibility field
-- ('public' | 'friends' | 'private'), while keeping is_public in sync
-- for backward-compatible RLS policies.

-- 1. Add the column (default 'public' to match existing is_public = true rows)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'friends', 'private'));

-- 2. Back-fill existing rows:
--    is_public = true  → 'public'
--    is_public = false → 'private'
UPDATE public.reviews
SET visibility = CASE
  WHEN is_public = true THEN 'public'
  ELSE 'private'
END
WHERE visibility = 'public' AND is_public = false;

-- 3. Keep is_public in sync with new visibility writes via a simple trigger
CREATE OR REPLACE FUNCTION public.sync_review_visibility()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_public := (NEW.visibility <> 'private');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_review_visibility ON public.reviews;
CREATE TRIGGER trg_sync_review_visibility
  BEFORE INSERT OR UPDATE OF visibility
  ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_visibility();

-- 4. Update the SELECT RLS policy so 'friends' reviews are visible
--    only to users who follow the author.
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "Users can view public reviews" ON public.reviews;
DROP POLICY IF EXISTS "select_reviews" ON public.reviews;

CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (
    -- Always allowed: own reviews
    uid = auth.uid()
    -- Public reviews
    OR visibility = 'public'
    -- Friends-only reviews: viewer must follow the author
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid()
          AND following_id = reviews.uid
      )
    )
  );
