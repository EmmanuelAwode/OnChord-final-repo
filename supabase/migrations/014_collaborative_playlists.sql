-- Migration: Collaborative Playlists
-- Creates tables for real-time collaborative playlists

-- =============================================================================
-- COLLABORATIVE PLAYLISTS
-- =============================================================================

-- Main playlists table
CREATE TABLE IF NOT EXISTS public.collaborative_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add creator_id column if table existed without it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collaborative_playlists' AND column_name = 'creator_id') THEN
        ALTER TABLE public.collaborative_playlists ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'collaborative_playlists' AND column_name = 'is_public') THEN
        ALTER TABLE public.collaborative_playlists ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Playlist members/collaborators
CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.collaborative_playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'contributor' CHECK (role IN ('owner', 'admin', 'contributor', 'viewer')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES auth.users(id),
    UNIQUE(playlist_id, user_id)
);

-- Playlist tracks
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.collaborative_playlists(id) ON DELETE CASCADE,
    track_id VARCHAR(100) NOT NULL,
    track_title VARCHAR(255) NOT NULL,
    track_artist VARCHAR(255) NOT NULL,
    album_name VARCHAR(255),
    album_cover TEXT,
    duration_ms INTEGER,
    preview_url TEXT,
    spotify_url TEXT,
    apple_music_url TEXT,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    position INTEGER NOT NULL DEFAULT 0,
    UNIQUE(playlist_id, track_id)
);

-- Playlist activity/chat messages
CREATE TABLE IF NOT EXISTS public.playlist_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.collaborative_playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'track_share', 'gif', 'system')),
    track_data JSONB, -- For track shares
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_playlists_creator ON public.collaborative_playlists(creator_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user ON public.playlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist ON public.playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON public.playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_messages_playlist ON public.playlist_messages(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_messages_created ON public.playlist_messages(playlist_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.collaborative_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "playlists_select" ON public.collaborative_playlists;
DROP POLICY IF EXISTS "playlists_insert" ON public.collaborative_playlists;
DROP POLICY IF EXISTS "playlists_update" ON public.collaborative_playlists;
DROP POLICY IF EXISTS "playlists_delete" ON public.collaborative_playlists;
DROP POLICY IF EXISTS "collaborators_select" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "collaborators_insert" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "collaborators_delete" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "tracks_select" ON public.playlist_tracks;
DROP POLICY IF EXISTS "tracks_insert" ON public.playlist_tracks;
DROP POLICY IF EXISTS "tracks_delete" ON public.playlist_tracks;
DROP POLICY IF EXISTS "messages_select" ON public.playlist_messages;
DROP POLICY IF EXISTS "messages_insert" ON public.playlist_messages;

-- Playlists: Viewable if public, or if user is a collaborator
CREATE POLICY "playlists_select" ON public.collaborative_playlists
    FOR SELECT USING (
        is_public = true 
        OR creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators 
            WHERE playlist_id = id AND user_id = auth.uid()
        )
    );

-- Playlists: Create own playlists
CREATE POLICY "playlists_insert" ON public.collaborative_playlists
    FOR INSERT WITH CHECK (creator_id = auth.uid());

-- Playlists: Update if owner or admin
CREATE POLICY "playlists_update" ON public.collaborative_playlists
    FOR UPDATE USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators 
            WHERE playlist_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Playlists: Delete if owner
CREATE POLICY "playlists_delete" ON public.collaborative_playlists
    FOR DELETE USING (creator_id = auth.uid());

-- Collaborators: View if member
CREATE POLICY "collaborators_select" ON public.playlist_collaborators
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators pc
            WHERE pc.playlist_id = playlist_id AND pc.user_id = auth.uid()
        )
    );

-- Collaborators: Add if owner/admin
CREATE POLICY "collaborators_insert" ON public.playlist_collaborators
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collaborative_playlists 
            WHERE id = playlist_id AND creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators 
            WHERE playlist_id = playlist_collaborators.playlist_id 
            AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Collaborators: Remove self or if admin
CREATE POLICY "collaborators_delete" ON public.playlist_collaborators
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.collaborative_playlists 
            WHERE id = playlist_id AND creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators 
            WHERE playlist_id = playlist_collaborators.playlist_id 
            AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Tracks: View if member
CREATE POLICY "tracks_select" ON public.playlist_tracks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.collaborative_playlists p
            WHERE p.id = playlist_id AND (
                p.is_public = true 
                OR p.creator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators 
                    WHERE playlist_id = p.id AND user_id = auth.uid()
                )
            )
        )
    );

-- Tracks: Add if contributor+
CREATE POLICY "tracks_insert" ON public.playlist_tracks
    FOR INSERT WITH CHECK (
        added_by = auth.uid() AND (
            EXISTS (
                SELECT 1 FROM public.collaborative_playlists 
                WHERE id = playlist_id AND creator_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.playlist_collaborators 
                WHERE playlist_id = playlist_tracks.playlist_id 
                AND user_id = auth.uid() AND role IN ('owner', 'admin', 'contributor')
            )
        )
    );

-- Tracks: Remove own tracks or if admin
CREATE POLICY "tracks_delete" ON public.playlist_tracks
    FOR DELETE USING (
        added_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.collaborative_playlists 
            WHERE id = playlist_id AND creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.playlist_collaborators 
            WHERE playlist_id = playlist_tracks.playlist_id 
            AND user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Messages: View if member
CREATE POLICY "messages_select" ON public.playlist_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.collaborative_playlists p
            WHERE p.id = playlist_id AND (
                p.creator_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.playlist_collaborators 
                    WHERE playlist_id = p.id AND user_id = auth.uid()
                )
            )
        )
    );

-- Messages: Send if member
CREATE POLICY "messages_insert" ON public.playlist_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND (
            EXISTS (
                SELECT 1 FROM public.collaborative_playlists 
                WHERE id = playlist_id AND creator_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.playlist_collaborators 
                WHERE playlist_id = playlist_messages.playlist_id 
                AND user_id = auth.uid()
            )
        )
    );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-add creator as owner collaborator when playlist is created
CREATE OR REPLACE FUNCTION add_playlist_owner()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.playlist_collaborators (playlist_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_playlist_created ON public.collaborative_playlists;
CREATE TRIGGER on_playlist_created
    AFTER INSERT ON public.collaborative_playlists
    FOR EACH ROW EXECUTE FUNCTION add_playlist_owner();

-- Update playlist updated_at when tracks change
CREATE OR REPLACE FUNCTION update_playlist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.collaborative_playlists 
    SET updated_at = NOW() 
    WHERE id = COALESCE(NEW.playlist_id, OLD.playlist_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_tracks_changed ON public.playlist_tracks;
CREATE TRIGGER on_tracks_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.playlist_tracks
    FOR EACH ROW EXECUTE FUNCTION update_playlist_timestamp();

-- =============================================================================
-- ENABLE REALTIME (ignore if already enabled)
-- =============================================================================

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_tracks;
EXCEPTION WHEN duplicate_object THEN
    -- Already added, ignore
END $$;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_messages;
EXCEPTION WHEN duplicate_object THEN
    -- Already added, ignore
END $$;

DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_collaborators;
EXCEPTION WHEN duplicate_object THEN
    -- Already added, ignore
END $$;
