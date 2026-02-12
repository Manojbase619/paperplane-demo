-- ============================================
-- Admin / stats tables only
-- Run in Supabase: SQL Editor → New query → paste → Run
-- Fixes: "Could not find the table 'public.call_sessions'" and daily_usage
-- ============================================

-- ============================================
-- TABLE: daily_usage (quota + admin stats)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_usage (
  phone TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  calls_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (phone, usage_date)
);

-- ============================================
-- TABLE: call_sessions (live calls + export)
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

CREATE INDEX IF NOT EXISTS idx_call_sessions_start ON public.call_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_call_sessions_end ON public.call_sessions(end_time);
