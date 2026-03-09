-- 015_direct_messages.sql
-- Direct messaging between users

-- CONVERSATIONS table (tracks who is chatting with whom)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 < participant_2) -- Ensure consistent ordering to prevent duplicates
);

-- Index for fast lookup of user's conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2, last_message_at DESC);

-- DIRECT MESSAGES table 
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif', 'track')),
  -- For shared tracks
  track_id TEXT,
  track_title TEXT,
  track_artist TEXT,
  track_cover_url TEXT,
  -- For images/gifs
  media_url TEXT,
  -- Read status
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(conversation_id, read_at) WHERE read_at IS NULL;

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Policies for direct messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON direct_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = direct_messages.conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON direct_messages;
CREATE POLICY "Users can send messages in their conversations"
  ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update read status of messages to them" ON direct_messages;
CREATE POLICY "Users can update read status of messages to them"
  ON direct_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = direct_messages.conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

-- Enable realtime for instant messaging
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  -- Ensure consistent ordering (smaller UUID first)
  IF user1_id < user2_id THEN
    p1 := user1_id;
    p2 := user2_id;
  ELSE
    p1 := user2_id;
    p2 := user1_id;
  END IF;
  
  -- Try to find existing conversation
  SELECT id INTO conv_id FROM conversations 
  WHERE participant_1 = p1 AND participant_2 = p2;
  
  -- Create if not exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations (participant_1, participant_2)
    VALUES (p1, p2)
    RETURNING id INTO conv_id;
  END IF;
  
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM direct_messages dm
    JOIN conversations c ON dm.conversation_id = c.id
    WHERE (c.participant_1 = user_id OR c.participant_2 = user_id)
    AND dm.sender_id != user_id
    AND dm.read_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
