/**
 * Prompt Compiler Engine
 * Compiles AgentSpec + optional memory into a single system prompt string.
 * No free-form prompts; template-only.
 */

import type { AgentSpec } from "./agent-spec";

export interface MemoryContext {
  summary?: string;
  /** Additional key-value context (e.g. user preferences, last booking) */
  [key: string]: unknown;
}

/**
 * Compiles system prompt from AgentSpec and optional memory.
 * Injects role, objective, constraints, call flow, and memory summary.
 */
export function compileSystemPrompt(
  agentSpec: AgentSpec,
  memory?: MemoryContext | null
): string {
  const { business_type, agent_role, objective, tone, constraints, call_flow } =
    agentSpec;

  const constraintsList =
    Array.isArray(constraints) && constraints.length > 0
      ? constraints.map((c) => `* ${c}`).join("\n")
      : "* (none specified)";

  const infoGathering =
    Array.isArray(call_flow.information_gathering) &&
    call_flow.information_gathering.length > 0
      ? call_flow.information_gathering.map((q, i) => `${i + 1}. ${q}`).join("\n")
      : "(none specified)";

  const memoryBlock = memory?.summary
    ? String(memory.summary).trim()
    : "(No prior context)";

  return `You are ${agent_role} in the ${business_type} domain.

Primary Objective:
${objective}

Tone:
${tone}

Constraints:
${constraintsList}

Call Flow Structure:
Introduction:
${call_flow.introduction}

Verification:
${call_flow.verification}

Purpose:
${call_flow.purpose}

Information Gathering:
${infoGathering}

Closing:
${call_flow.closing}

Memory Context:
${memoryBlock}

Strict Rules:
* Do not operate outside defined business domain
* Do not invent policies
* Stay task-focused
* Follow call flow order
`.trim();
}
