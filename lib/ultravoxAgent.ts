/**
 * Wrap a generated or custom prompt for per-call use on Basethesis Voice.
 * Ensures platform consistency (clarity, politeness, structured conversation)
 * without mutating the agent's persistent config.
 */
export function wrapPromptForBasethesisVoice(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return trimmed;
  return `You are operating inside the Basethesis Voice platform. Follow the configuration below strictly.

${trimmed}

Maintain clarity, politeness, and structured conversation.`;
}

/**
 * Server/agent config sync with Ultravox (prompt save).
 * Call from client after saving prompt in console.
 */
export async function sendPromptToUltravox(
  agentId: string,
  prompt: string
): Promise<{ ok: boolean; synced?: boolean }> {
  const res = await fetch("/api/ultravox/update-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, prompt }),
  });
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok && (data.ok === true),
    synced: data.synced === true,
  };
}
