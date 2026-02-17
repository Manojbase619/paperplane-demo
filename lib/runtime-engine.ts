/**
 * Runtime Engine — executes AgentSpec at voice call time.
 * Retrieves call session → agent spec → memory, compiles prompt, calls OpenAI.
 * Voice transport (Ultravox) is separate; this layer is brain-only.
 */

import type { AgentSpec } from "./agent-spec";
import { compileSystemPrompt, ensureNoRoleAcknowledgment, type MemoryContext } from "./prompt-compiler";
import {
  getRuntimeCallSessionByCallId,
  getAgentById,
  getLatestConversationSummaryForUser,
} from "./db-helpers";

export interface BrainResult {
  reply: string;
  systemPromptUsed: string;
}

/**
 * Retrieve compiled system prompt for a call (session + agent + memory).
 * Returns null if no runtime session or agent; otherwise compiled string.
 */
export async function getCompiledPromptForCall(
  callId: string
): Promise<{ systemPrompt: string; agentId: string } | null> {
  const session = await getRuntimeCallSessionByCallId(callId);
  if (!session) return null;

  const agent = await getAgentById(session.agent_id);
  if (!agent?.spec_json) return null;

  const spec = agent.spec_json as unknown as AgentSpec;
  if (!spec?.business_type || !spec?.call_flow) return null;

  let memory: MemoryContext | null = null;
  if (session.user_id) {
    const summaryRow = await getLatestConversationSummaryForUser(session.user_id);
    if (summaryRow?.summary_data) {
      memory = {
        summary:
          typeof summaryRow.summary_data === "object"
            ? JSON.stringify(summaryRow.summary_data, null, 2)
            : String(summaryRow.summary_data),
      };
    }
  }

  const compiled = compileSystemPrompt(spec, memory);
  const systemPrompt = ensureNoRoleAcknowledgment(compiled);
  return { systemPrompt, agentId: session.agent_id };
}

/**
 * Execute brain loop: get compiled prompt, call OpenAI with user transcript, return reply.
 * Used by webhook on call.message.
 */
export async function executeBrain(
  callId: string,
  userTranscript: string,
  openaiApiKey: string
): Promise<BrainResult | null> {
  const compiled = await getCompiledPromptForCall(callId);
  if (!compiled) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: compiled.systemPrompt },
        { role: "user", content: userTranscript },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI brain failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply =
    data?.choices?.[0]?.message?.content?.trim() ??
    "I'm sorry, I couldn't process that.";

  return {
    reply,
    systemPromptUsed: compiled.systemPrompt,
  };
}
