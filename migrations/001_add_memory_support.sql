-- ============================================
-- Ultravox Memory Support Migration
-- Date: 2026-02-04
-- Purpose: Add conversation memory and user tracking
-- ============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- Stores user profiles identified by phone number
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_call_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- ============================================
-- TABLE: calls (enhanced)
-- Add user tracking and timestamps to existing calls table
-- ============================================

-- Add new columns to existing calls table (if they don't exist)
DO $$
BEGIN
  -- Check and add columns one by one to avoid errors
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN user_id UUID REFERENCES users(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE calls ADD COLUMN phone_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE calls ADD COLUMN started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE calls ADD COLUMN ended_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'outcome'
  ) THEN
    ALTER TABLE calls ADD COLUMN outcome TEXT;
  END IF;
END $$;

-- Index for finding user's recent calls
CREATE INDEX IF NOT EXISTS idx_calls_user_recent ON calls(user_id, started_at DESC) WHERE user_id IS NOT NULL;

-- Index for phone-based lookups (denormalized for speed)
CREATE INDEX IF NOT EXISTS idx_calls_phone_recent ON calls(phone_number, started_at DESC) WHERE phone_number IS NOT NULL;

-- ============================================
-- TABLE: call_messages
-- Stores individual conversation messages
-- ============================================
CREATE TABLE IF NOT EXISTS call_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  text TEXT NOT NULL,
  medium TEXT DEFAULT 'voice' CHECK (medium IN ('voice', 'text', 'api')),
  ordinal INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_call_messages_call
    FOREIGN KEY (call_id)
    REFERENCES calls(call_id)
    ON DELETE CASCADE
);

-- Index for fetching messages in order
CREATE INDEX IF NOT EXISTS idx_call_messages_order ON call_messages(call_id, ordinal);

-- ============================================
-- TABLE: call_summaries
-- Stores AI-generated summaries and structured data
-- ============================================
CREATE TABLE IF NOT EXISTS call_summaries (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  user_id UUID REFERENCES users(user_id),
  summary_type TEXT NOT NULL CHECK (summary_type IN ('booking_progress', 'user_preferences', 'conversation_summary')),
  summary_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_summaries_call
    FOREIGN KEY (call_id)
    REFERENCES calls(call_id)
    ON DELETE CASCADE
);

-- Index for user's summaries
CREATE INDEX IF NOT EXISTS idx_summaries_user ON call_summaries(user_id, created_at DESC);

-- ============================================
-- FUNCTION: updated_at trigger
-- Automatically update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLICIES: Row Level Security (if enabled)
-- Uncomment if using RLS in production
-- ============================================

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE call_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE call_summaries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VIEWS: Common queries
-- ============================================

-- View: User call history with summaries
CREATE OR REPLACE VIEW user_call_history AS
SELECT
  c.call_id,
  c.user_id,
  c.phone_number,
  c.status,
  c.started_at,
  c.ended_at,
  c.outcome,
  COUNT(cm.message_id) as message_count,
  cs.summary_data
FROM calls c
LEFT JOIN call_messages cm ON cm.call_id = c.call_id
LEFT JOIN call_summaries cs ON cs.call_id = c.call_id
GROUP BY c.call_id, c.user_id, c.phone_number, c.status, c.started_at, c.ended_at, c.outcome, cs.summary_data
ORDER BY c.started_at DESC;

-- ============================================
-- GRANTS (adjust as needed)
-- ============================================

-- Grant access to service role (for API)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verify indexes created:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Sample query: Get user's recent calls with messages
-- SELECT
--   u.phone_number,
--   u.name,
--   c.call_id,
--   c.started_at,
--   COUNT(cm.message_id) as messages
-- FROM users u
-- LEFT JOIN calls c ON c.user_id = u.user_id
-- LEFT JOIN call_messages cm ON cm.call_id = c.call_id
-- WHERE u.phone_number = '+911234567890'
-- GROUP BY u.phone_number, u.name, c.call_id, c.started_at
-- ORDER BY c.started_at DESC
-- LIMIT 5;
