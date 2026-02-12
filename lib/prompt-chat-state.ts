/**
 * Internal state for conversational prompt builder.
 * Extracted from chat by the AI; never shown as template variables to the user.
 */
export type PromptChatState = {
  role: string;
  objective: string;
  audience: string;
  tone: string;
  compliance: string;
  questions: string[];
  objectionHandling: string;
  closing: string;
};

export const EMPTY_STATE: PromptChatState = {
  role: "",
  objective: "",
  audience: "",
  tone: "",
  compliance: "",
  questions: [],
  objectionHandling: "",
  closing: "",
};

export function isStateSufficient(state: PromptChatState): boolean {
  const filled = [
    state.role.trim(),
    state.objective.trim(),
    state.audience.trim(),
    state.tone.trim(),
  ].filter(Boolean).length;
  const extra = [
    state.compliance.trim(),
    state.questions.length,
    state.objectionHandling.trim(),
    state.closing.trim(),
  ].filter((x) => (Array.isArray(x) ? x : String(x).length > 0)).length;
  return filled >= 4 && extra >= 2;
}
