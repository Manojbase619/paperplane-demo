/**
 * Agent Builder — deterministic state machine for agent creation.
 * GPT is used only to: rephrase questions, expand call flow after schema collected.
 * Next step is always determined by code, not by GPT.
 */

import type { AgentSpec } from "./agent-spec";
import {
  AGENT_BUILDER_STEPS,
  COLLECTED_FIELDS,
  type AgentBuilderStep,
  type AgentSpecKey,
} from "./agent-spec";

export interface BuilderState {
  current_step: AgentBuilderStep;
  collected_data: Partial<AgentSpec>;
  status: "active" | "completed";
}

const STEP_QUESTIONS: Record<Exclude<AgentBuilderStep, "complete">, string> = {
  collect_business_type:
    "What is the business type or industry for this agent? (e.g. banking, travel, healthcare)",
  collect_agent_role:
    "What is the agent's role or job title? (e.g. loan advisor, travel consultant)",
  collect_objective:
    "What is the primary objective of this agent in one sentence?",
  collect_tone:
    "What tone should the agent use? (e.g. professional and warm, concise and factual)",
  collect_constraints:
    "List any strict constraints, one per line, or say 'none' to skip.",
  generate_call_flow:
    "Generating call flow from your inputs...",
};

/**
 * Returns the next builder step based on current state.
 * Deterministic: no LLM decides next step.
 */
export function getNextStep(state: BuilderState): AgentBuilderStep {
  if (state.status === "completed" || state.current_step === "complete") {
    return "complete";
  }

  const idx = AGENT_BUILDER_STEPS.indexOf(state.current_step);
  if (idx < 0 || idx >= AGENT_BUILDER_STEPS.length - 1) {
    return "complete";
  }

  const next = AGENT_BUILDER_STEPS[idx + 1];
  return next;
}

/**
 * Returns the next structured question for the builder.
 * If a required field is missing, asks for it in order.
 */
export function getNextBuilderQuestion(state: BuilderState): string {
  if (state.status === "completed") {
    return "Agent build is complete.";
  }

  if (state.current_step === "generate_call_flow") {
    return STEP_QUESTIONS.generate_call_flow;
  }

  if (state.current_step === "complete") {
    return "Agent build is complete.";
  }

  // Check required fields in order; first missing one determines the step we're effectively on
  const data = state.collected_data || {};
  for (const field of COLLECTED_FIELDS) {
    const value = data[field];
    if (field === "constraints") {
      if (!Array.isArray(value) || value.length === 0) {
        return STEP_QUESTIONS.collect_constraints;
      }
      continue;
    }
    if (value === undefined || value === null || String(value).trim() === "") {
      return STEP_QUESTIONS[`collect_${field}` as keyof typeof STEP_QUESTIONS];
    }
  }

  // All collected; next is generate_call_flow
  return STEP_QUESTIONS.generate_call_flow;
}

/**
 * Which step we are effectively on from collected_data (for state machine sync).
 */
export function getEffectiveStep(collected_data: Partial<AgentSpec>): AgentBuilderStep {
  const d = collected_data || {};
  if (d.call_flow && typeof d.call_flow === "object") {
    const cf = d.call_flow as AgentSpec["call_flow"];
    if (
      cf.introduction != null &&
      cf.verification != null &&
      cf.purpose != null &&
      Array.isArray(cf.information_gathering) &&
      cf.closing != null
    ) {
      return "complete";
    }
  }

  if (!d.business_type?.trim()) return "collect_business_type";
  if (!d.agent_role?.trim()) return "collect_agent_role";
  if (!d.objective?.trim()) return "collect_objective";
  if (!d.tone?.trim()) return "collect_tone";
  if (!Array.isArray(d.constraints)) return "collect_constraints";
  if (d.constraints.length === 0) return "collect_constraints";
  return "generate_call_flow";
}

/**
 * Parse user reply for constraints: "one per line" or "none".
 */
export function parseConstraintsInput(text: string): string[] {
  const t = text.trim().toLowerCase();
  if (t === "none" || t === "no" || t === "n/a") return [];
  return text
    .split(/\n|\r/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Generate structured call_flow via OpenAI. Called once after all required fields collected.
 * Returns strict JSON matching AgentSpec.call_flow.
 */
export async function generateCallFlowWithOpenAI(
  spec: Pick<AgentSpec, "business_type" | "agent_role" | "objective" | "tone" | "constraints">,
  apiKey: string
): Promise<AgentSpec["call_flow"]> {
  const prompt = `Generate a structured call flow for:
Business type: ${spec.business_type}
Agent role: ${spec.agent_role}
Objective: ${spec.objective}
Tone: ${spec.tone}
Constraints: ${(spec.constraints || []).join("; ")}

Return strict JSON only, no markdown, matching this shape:
{
  "introduction": "string",
  "verification": "string",
  "purpose": "string",
  "information_gathering": ["string", "string", ...],
  "closing": "string"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI call_flow generation failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw =
    data?.choices?.[0]?.message?.content?.trim() ?? "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;
  const parsed = JSON.parse(jsonStr) as unknown;

  const intro = typeof parsed.introduction === "string" ? parsed.introduction : "";
  const verification = typeof parsed.verification === "string" ? parsed.verification : "";
  const purpose = typeof parsed.purpose === "string" ? parsed.purpose : "";
  const info = Array.isArray(parsed.information_gathering)
    ? parsed.information_gathering.map((x: unknown) => String(x))
    : [];
  const closing = typeof parsed.closing === "string" ? parsed.closing : "";

  return {
    introduction: intro,
    verification,
    purpose,
    information_gathering: info,
    closing,
  };
}
