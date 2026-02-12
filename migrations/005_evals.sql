-- ============================================
-- Evals & simulations: eval_runs, eval_results
-- Run in Supabase: SQL Editor → New query → paste → Run
-- ============================================

-- ============================================
-- TABLE: eval_runs
-- ============================================
CREATE TABLE IF NOT EXISTS public.eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('call', 'golden', 'simulation')),
  call_id TEXT,
  scenario_id TEXT,
  agent_id UUID REFERENCES public.agents(id),
  prompt_version TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_call ON public.eval_runs(call_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_scenario ON public.eval_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_agent ON public.eval_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_eval_runs_created ON public.eval_runs(created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_eval_runs_updated_at ON public.eval_runs;
    CREATE TRIGGER update_eval_runs_updated_at
      BEFORE UPDATE ON public.eval_runs
      FOR EACH ROW
      EXECUTE PROCEDURE public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- TABLE: eval_results
-- ============================================
CREATE TABLE IF NOT EXISTS public.eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_run_id UUID NOT NULL REFERENCES public.eval_runs(id) ON DELETE CASCADE,
  call_id TEXT,
  scenario_id TEXT,
  agent_id UUID REFERENCES public.agents(id),
  prompt_version TEXT,
  scores JSONB NOT NULL DEFAULT '[]',
  overall_score NUMERIC(4,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_results_run ON public.eval_results(eval_run_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_call ON public.eval_results(call_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_agent ON public.eval_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_created ON public.eval_results(created_at DESC);
