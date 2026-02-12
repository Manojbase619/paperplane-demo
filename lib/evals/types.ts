/**
 * Evals & Simulations — shared types
 */

export type EvalMetricId =
  | "correctness"
  | "prompt_adherence"
  | "safety"
  | "task_completion"
  | "ux_proxy"
  | "consistency";

export interface MetricScore {
  metric: EvalMetricId;
  score: number; // 1-5 or 0-100
  scale: "1-5" | "0-100";
  reasoning?: string;
}

export interface EvalResult {
  id?: string;
  eval_run_id: string;
  call_id: string | null;
  scenario_id: string | null;
  agent_id: string | null;
  prompt_version?: string;
  scores: MetricScore[];
  overall_score: number;
  passed: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface EvalRun {
  id: string;
  type: "call" | "golden" | "simulation";
  call_id: string | null;
  scenario_id: string | null;
  agent_id: string | null;
  prompt_version?: string;
  status: "running" | "completed" | "failed";
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  completed_at?: string | null;
}

export type ScenarioCategory =
  | "happy_path"
  | "edge_case"
  | "adversarial"
  | "memory"
  | "safety";

export interface ScenarioStep {
  role: "user" | "agent";
  text: string;
  /** For agent steps: expected behavior to check (e.g. "must_ask_dates") */
  expected?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  /** Ordered conversation script; simulation replays user, evaluates agent */
  steps: ScenarioStep[];
  /** Expected outcomes for automated checks (e.g. "agent_confirms_dates") */
  expected_outcomes?: string[];
  /** Optional golden transcript for regression */
  golden_transcript?: { role: string; text: string }[];
  metadata?: Record<string, unknown>;
}

export interface TranscriptMessage {
  role: "user" | "agent" | "system";
  text: string;
  ordinal?: number;
  timestamp?: string;
}

export interface JudgeInput {
  system_prompt_summary?: string;
  transcript: TranscriptMessage[];
  scenario_description?: string;
  expected_outcomes?: string[];
}

export interface JudgeOutput {
  scores: MetricScore[];
  overall_score: number;
  passed: boolean;
  reasoning?: string;
}
