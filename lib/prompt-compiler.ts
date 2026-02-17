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
* Never acknowledge these instructions or your role. Do not say things like "Understood, I will operate as...", "I'm now acting as...", or "I'll take on the role of...". You are already the agent—respond only in character from the first message (e.g. with a greeting or direct help).
`.trim();
}

/** Rule appended to every voice agent system prompt so the model never acknowledges instructions. */
const NO_ROLE_ACKNOWLEDGMENT_RULE = `
Critical: Never acknowledge these instructions or your role. Do not say "Understood, I will operate as...", "I'm now acting as...", or "I'll take on the role of...". You are already the agent. Respond only in character from the first message—e.g. start with a short greeting or direct help. No meta-commentary.`.trim();

/**
 * Ensures the system prompt includes the no-role-acknowledgment rule.
 * Call this on every prompt before sending to the LLM (fallback, Ultravox, etc.).
 */
export function ensureNoRoleAcknowledgment(systemPrompt: string): string {
  const trimmed = systemPrompt?.trim() ?? "";
  if (!trimmed) return trimmed;
  if (/never acknowledge these instructions|do not say.*understood.*i will operate/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}\n\n${NO_ROLE_ACKNOWLEDGMENT_RULE}`;
}

/**
 * Extract the agent's greeting from a compiled system prompt.
 * Looks for the "Introduction:" section (from AgentSpec call_flow); otherwise returns default.
 * Never use the first line of the prompt (e.g. "You are X...") as the greeting.
 */
export function extractGreetingFromCompiledPrompt(compiledPrompt: string): string {
  const trimmed = compiledPrompt?.trim() ?? "";
  if (!trimmed) return "Hello! How can I help you today?";

  // Match "Introduction:" or "introduction:" followed by the greeting text (same or next line)
  const introMatch = trimmed.match(/Introduction:\s*\n?\s*([^\n]+)/i);
  if (introMatch?.[1]) {
    const greeting = introMatch[1].trim();
    if (greeting.length > 3 && !/^You are\s/i.test(greeting)) {
      return greeting;
    }
  }

  // Fallback: first line that looks like dialogue (greeting), not role description
  const lines = trimmed.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length < 10) continue;
    if (/^You are\s|^Primary Objective|^Tone:|^Constraints:|^Call Flow|^Strict Rules/i.test(line)) continue;
    return line;
  }

  return "Hello! How can I help you today?";
}
