/**
 * Internal state for conversational prompt builder.
 * Ultravox-style: primary objective → role/persona → rules → specific examples → generate.
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
  /** Ultravox-style: agent display name (e.g. "Alex") */
  agentName: string;
  /** Compliance section label (e.g. "RBI Compliance Rules") */
  complianceLabel: string;
  /** Specific examples of rules user gave */
  rulesExamples: string;
  /** Information to collect during call (e.g. loan amount, course, university) */
  informationToCollect: string;
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
  agentName: "Alex",
  complianceLabel: "",
  rulesExamples: "",
  informationToCollect: "",
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
