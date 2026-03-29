-- ============================================================
-- AI Chat History Schema
-- Create tables for storing AIAssistant sessions and messages
-- ============================================================

-- 1. Create ai_chat_sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create ai_chat_messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS for ai_chat_sessions
CREATE POLICY "users_select_own_sessions" ON ai_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_sessions" ON ai_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_sessions" ON ai_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_sessions" ON ai_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 5. RLS for ai_chat_messages
CREATE POLICY "users_select_own_messages" ON ai_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_messages" ON ai_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- 6. Trigger for updating session update_at time
CREATE OR REPLACE FUNCTION update_ai_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_ai_session_timestamp
AFTER INSERT ON ai_chat_messages
FOR EACH ROW EXECUTE FUNCTION update_ai_session_timestamp();
