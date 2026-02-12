/**
 * Persist eval runs and results to Supabase
 */

import { getSupabase } from "@/lib/database";
import type { EvalRun, EvalResult } from "./types";

export async function createEvalRun(run: Omit<EvalRun, "id" | "created_at">): Promise<EvalRun> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("eval_runs")
    .insert({
      type: run.type,
      call_id: run.call_id,
      scenario_id: run.scenario_id,
      agent_id: run.agent_id,
      prompt_version: run.prompt_version,
      status: run.status,
      error_message: run.error_message,
      metadata: run.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return mapRowToEvalRun(data);
}

export async function updateEvalRunStatus(
  id: string,
  status: EvalRun["status"],
  errorMessage?: string | null
): Promise<void> {
  const supabase = getSupabase();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (errorMessage !== undefined) updates.error_message = errorMessage;
  if (status === "completed" || status === "failed") updates.completed_at = new Date().toISOString();

  const { error } = await supabase.from("eval_runs").update(updates).eq("id", id);
  if (error) throw error;
}

export async function insertEvalResult(result: Omit<EvalResult, "id" | "created_at">): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("eval_results").insert({
    eval_run_id: result.eval_run_id,
    call_id: result.call_id,
    scenario_id: result.scenario_id,
    agent_id: result.agent_id,
    prompt_version: result.prompt_version,
    scores: result.scores,
    overall_score: result.overall_score,
    passed: result.passed,
    metadata: result.metadata ?? {},
  });
  if (error) throw error;
}

export async function getEvalResults(filters: {
  call_id?: string;
  eval_run_id?: string;
  agent_id?: string;
  limit?: number;
}): Promise<EvalResult[]> {
  const supabase = getSupabase();
  let q = supabase
    .from("eval_results")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.call_id) q = q.eq("call_id", filters.call_id);
  if (filters.eval_run_id) q = q.eq("eval_run_id", filters.eval_run_id);
  if (filters.agent_id) q = q.eq("agent_id", filters.agent_id);
  if (filters.limit) q = q.limit(filters.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapRowToEvalResult);
}

function mapRowToEvalRun(row: any): EvalRun {
  return {
    id: row.id,
    type: row.type,
    call_id: row.call_id,
    scenario_id: row.scenario_id,
    agent_id: row.agent_id,
    prompt_version: row.prompt_version,
    status: row.status,
    error_message: row.error_message,
    metadata: row.metadata,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

function mapRowToEvalResult(row: any): EvalResult {
  return {
    id: row.id,
    eval_run_id: row.eval_run_id,
    call_id: row.call_id,
    scenario_id: row.scenario_id,
    agent_id: row.agent_id,
    prompt_version: row.prompt_version,
    scores: row.scores ?? [],
    overall_score: row.overall_score,
    passed: row.passed,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}
