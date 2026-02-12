-- ============================================
-- agent_prompts: Store generated Ultravox prompts
-- ============================================

CREATE TABLE IF NOT EXISTS public.agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_user_id
  ON public.agent_prompts(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_created_at
  ON public.agent_prompts(created_at DESC);
