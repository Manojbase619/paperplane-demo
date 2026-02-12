-- ============================================
-- Complete schema for intent-capture / paperplane
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Fixes: "Could not find the table 'public.users'" (and related missing tables)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_call_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone_number);

-- ============================================
-- TABLE: calls
-- ============================================
CREATE TABLE IF NOT EXISTS public.calls (
  call_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(user_id),
  phone_number TEXT,
  source TEXT,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  outcome TEXT,
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_calls_user_recent ON public.calls(user_id, started_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_phone_recent ON public.calls(phone_number, started_at DESC) WHERE phone_number IS NOT NULL;

-- ============================================
-- TABLE: call_messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.call_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES public.calls(call_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
  text TEXT NOT NULL,
  medium TEXT DEFAULT 'voice',
  ordinal INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_messages_order ON public.call_messages(call_id, ordinal);

-- ============================================
-- TABLE: call_summaries
-- ============================================
CREATE TABLE IF NOT EXISTS public.call_summaries (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL REFERENCES public.calls(call_id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id),
  summary_type TEXT NOT NULL CHECK (summary_type IN ('booking_progress', 'user_preferences', 'conversation_summary')),
  summary_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_summaries_user ON public.call_summaries(user_id, created_at DESC);

-- ============================================
-- TABLE: daily_usage (quota / analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_usage (
  phone TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  calls_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (phone, usage_date)
);

-- ============================================
-- TABLE: call_sessions (store / export)
-- ============================================
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT,
  usage_date TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- ============================================
-- Trigger: users.updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();
