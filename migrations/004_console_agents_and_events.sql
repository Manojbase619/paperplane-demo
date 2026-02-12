-- ============================================
-- Console (Ultravox-style) schema
-- Agents + analytics events
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: agents
-- ============================================
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_agent_id TEXT, -- Ultravox agent ID (optional)
  name TEXT NOT NULL,
  voice_id TEXT,
  prompt TEXT,
  greeting TEXT,
  inactivity_config JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_external_agent_id
  ON public.agents(external_agent_id);

-- updated_at trigger if function exists (created by 002_complete_schema.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
    CREATE TRIGGER update_agents_updated_at
      BEFORE UPDATE ON public.agents
      FOR EACH ROW
      EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- TABLE: analytics_events
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id),
  call_id TEXT,
  phone_number TEXT,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_agent
  ON public.analytics_events(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_call
  ON public.analytics_events(call_id);
