-- ============================================
-- Agent Builder + Voice Runtime Schema
-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Tables: agents, agent_builder_sessions, runtime_call_sessions
-- (runtime_call_sessions = prompt's "call_sessions"; name avoids clash with usage call_sessions)
-- ============================================

-- ============================================
-- TABLE: agents
-- ============================================
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  spec_json JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_updated ON public.agents(updated_at DESC);

-- ============================================
-- TABLE: agent_builder_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_builder_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(user_id),
  current_step TEXT NOT NULL,
  collected_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_builder_sessions_user ON public.agent_builder_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_builder_sessions_status ON public.agent_builder_sessions(status);

-- ============================================
-- TABLE: runtime_call_sessions (call_sessions in spec: links call_id → agent_id for brain loop)
-- ============================================
CREATE TABLE IF NOT EXISTS public.runtime_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(user_id),
  state_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_runtime_call_sessions_call_id ON public.runtime_call_sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_runtime_call_sessions_agent ON public.runtime_call_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_runtime_call_sessions_user ON public.runtime_call_sessions(user_id);

-- ============================================
-- Trigger: agents.updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================
-- Trigger: agent_builder_sessions.updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_agent_builder_sessions_updated_at ON public.agent_builder_sessions;
CREATE TRIGGER update_agent_builder_sessions_updated_at
  BEFORE UPDATE ON public.agent_builder_sessions
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();
