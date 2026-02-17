/**
 * Runtime Prompt Builder
 *
 * Prompt = f(ActiveSubgraph(t), IntentForecast(t), EmotionalVector(t),
 *           ResponseSpec(t), ToolContext(t), ConversationRiskScore(t))
 *
 * The LLM receives a structured cognition state, not a static system string.
 * This module composes that state into the actual prompt payload.
 */

import type {
  CognitionState,
  CognitionStatePartial,
  UtteranceState,
  ActiveSubgraph,
  ResponseSpec,
  IntentForecast,
  ResponseBlueprint,
  ToolContext,
  ConversationRiskScore,
  TurnReflection,
} from "./schema";

export interface RuntimePromptResult {
  /** System prompt: cognition-aware instructions. */
  systemPrompt: string;
  /** User-facing content: utterance + optional structured hints. */
  userMessage: string;
  /** Optional JSON for APIs that support system payload. */
  systemPayload?: Record<string, unknown>;
}

/** Default ResponseSpec when not provided. */
const DEFAULT_RESPONSE_SPEC: ResponseSpec = {
  intent: "respond",
  tone: "neutral",
  speechRate: "normal",
  interruptionSafe: true,
  chunkable: true,
  repairable: true,
  emotionTarget: "calm",
  semanticPriority: "single_block",
};

/** Build ActiveSubgraph block for the prompt. */
function formatActiveSubgraph(subgraph: ActiveSubgraph): string {
  const lines: string[] = ["## Active dialogue state"];
  if (subgraph.summary) {
    lines.push(`Summary: ${subgraph.summary}`);
  }
  if (subgraph.goals.length > 0) {
    lines.push(
      "Goals: " +
        subgraph.goals
          .map((g) => `[${g.status}] ${g.goal}` + (g.userCommitment ? ` (user: ${g.userCommitment})` : ""))
          .join("; ")
    );
  }
  if (subgraph.unresolvedIntents.length > 0) {
    lines.push("Unresolved: " + subgraph.unresolvedIntents.join(", "));
  }
  return lines.join("\n");
}

/** Build ResponseSpec block so the LLM knows how to format. */
function formatResponseSpec(spec: ResponseSpec): string {
  const parts = [
    `Intent: ${spec.intent}`,
    `Tone: ${spec.tone}`,
    `Speech rate: ${spec.speechRate}`,
    `Interruption-safe: ${spec.interruptionSafe}`,
    `Chunkable: ${spec.chunkable}`,
    `Repairable: ${spec.repairable}`,
    `Emotion target: ${spec.emotionTarget}`,
    `Semantic priority: ${spec.semanticPriority}`,
  ];
  return "## Response spec\n" + parts.join("\n");
}

/** Build intent/blueprint block. */
function formatIntentForecast(
  forecast: IntentForecast | ResponseBlueprint
): string {
  const intent = "intent" in forecast ? forecast.intent : forecast.predictedIntent;
  const clarification =
    "clarificationNeeded" in forecast
      ? forecast.clarificationNeeded
      : (forecast as IntentForecast).clarificationNeeded;
  const structure =
    "responseStructure" in forecast
      ? forecast.responseStructure
      : (forecast as IntentForecast).responseStructure;
  const toolIds =
    "toolIds" in forecast
      ? forecast.toolIds
      : (forecast as IntentForecast).requiredToolIds;

  const lines = [
    "## Intent forecast",
    `Primary intent: ${intent}`,
    `Clarification needed: ${clarification ?? false}`,
    `Response structure: ${structure ?? "single_block"}`,
  ];
  if (toolIds?.length) {
    lines.push(`Tools to consider: ${toolIds.join(", ")}`);
  }
  return lines.join("\n");
}

/** Build tool context block. */
function formatToolContext(ctx: ToolContext): string {
  const lines = ["## Tool context", `Available: ${ctx.availableToolIds.join(", ") || "none"}`];
  if (ctx.lastUsedToolId) {
    lines.push(`Last used: ${ctx.lastUsedToolId}`);
    if (ctx.lastToolResult) {
      lines.push(`Last result: ${ctx.lastToolResult.slice(0, 200)}${ctx.lastToolResult.length > 200 ? "…" : ""}`);
    }
  }
  return lines.join("\n");
}

/** Build risk + mitigation block. */
function formatConversationRisk(risk: ConversationRiskScore): string {
  const lines = [
    "## Conversation risk",
    `Score: ${risk.score} (0=low, 1=high)`,
  ];
  if (risk.reasons?.length) {
    lines.push("Reasons: " + risk.reasons.join("; "));
  }
  if (risk.mitigation) {
    lines.push(`Mitigation: ${risk.mitigation}`);
  }
  return lines.join("\n");
}

/** Build utterance block — never pass only plain text; include signals. */
function formatUtterance(u: UtteranceState): string {
  const lines: string[] = ["## Current utterance"];
  lines.push(`Lexical: ${u.lexical}`);
  if (u.dialogueAct) lines.push(`Dialogue act: ${u.dialogueAct}`);
  if (u.emotionLabel) lines.push(`Emotion: ${u.emotionLabel}`);
  if (u.urgencyScore != null) lines.push(`Urgency: ${u.urgencyScore}`);
  if (u.acousticConfidence != null) lines.push(`Confidence: ${u.acousticConfidence}`);
  if (u.interruptionProbability != null) {
    lines.push(`Interruption probability: ${u.interruptionProbability}`);
  }
  return lines.join("\n");
}

/** Build previous reflection block (adaptation hints). */
function formatPreviousReflection(r: TurnReflection): string {
  const lines = [
    "## Previous turn reflection",
    `Intent aligned: ${r.intentAligned}`,
  ];
  if (r.emotionalExpectationMet != null) {
    lines.push(`Emotional expectation met: ${r.emotionalExpectationMet}`);
  }
  if (r.goalAdvanced != null) {
    lines.push(`Goal advanced: ${r.goalAdvanced}`);
  }
  if (r.policyUpdates) {
    const u = r.policyUpdates;
    const updates = [
      u.tonePolicy,
      u.verbosityPolicy,
      u.userPatienceEstimate,
      u.speakingSpeed,
      u.explanationDepth,
    ].filter(Boolean);
    if (updates.length) {
      lines.push("Policy updates for this turn: " + updates.join(", "));
    }
  }
  return lines.join("\n");
}

/**
 * Build the full runtime prompt from cognition state.
 * Use this when all layers are populated.
 */
export function buildRuntimePrompt(state: CognitionState): RuntimePromptResult {
  const blocks: string[] = [
    "You are responding in a voice conversation. Your input is structured cognition state, not raw chat.",
    "Use the response spec to shape your reply (tone, chunkability, interruption safety).",
    "Output only the semantic payload: what to say. Prosody and chunking are handled downstream.",
    "",
    formatUtterance(state.utterance),
    "",
    formatIntentForecast(state.intentForecast),
    "",
    formatActiveSubgraph(state.activeSubgraph),
    "",
    formatResponseSpec(state.responseSpec),
    "",
    formatToolContext(state.toolContext),
    "",
    formatConversationRisk(state.conversationRisk),
  ];

  if (state.previousReflection) {
    blocks.push("", formatPreviousReflection(state.previousReflection));
  }

  const systemPrompt = blocks.join("\n").trim();

  // User message: primary lexical content for compatibility with chat APIs
  const userMessage = state.utterance.lexicalNormalized ?? state.utterance.lexical;

  return {
    systemPrompt,
    userMessage,
    systemPayload: {
      utterance: state.utterance,
      intentForecast: state.intentForecast,
      activeSubgraph: state.activeSubgraph,
      responseSpec: state.responseSpec,
      toolContext: state.toolContext,
      conversationRisk: state.conversationRisk,
      previousReflection: state.previousReflection,
    },
  };
}

/**
 * Build runtime prompt from partial cognition state (gradual adoption).
 * Missing layers are omitted or defaulted so you can plug in one layer at a time.
 */
export function buildRuntimePromptPartial(
  state: CognitionStatePartial,
  baseSystemPrompt?: string
): RuntimePromptResult {
  const utterance = state.utterance;
  const intentForecast = state.intentForecast ?? {
    predictedIntent: "respond",
    clarificationNeeded: false,
    responseStructure: "single_block",
  } as IntentForecast;
  const activeSubgraph: ActiveSubgraph = state.activeSubgraph ?? {
    goals: [],
    edges: [],
    unresolvedIntents: [],
  };
  const responseSpec = state.responseSpec ?? DEFAULT_RESPONSE_SPEC;
  const toolContext: ToolContext = state.toolContext ?? {
    availableToolIds: [],
  };
  const conversationRisk: ConversationRiskScore = state.conversationRisk ?? {
    score: 0,
    mitigation: "none",
  };

  const blocks: string[] = [];

  if (baseSystemPrompt?.trim()) {
    blocks.push(baseSystemPrompt.trim(), "");
  }

  blocks.push(
    "## Runtime cognition state",
    "",
    formatUtterance(utterance),
    "",
    formatIntentForecast(intentForecast),
    "",
    formatActiveSubgraph(activeSubgraph),
    "",
    formatResponseSpec(responseSpec),
    "",
    formatToolContext(toolContext),
    "",
    formatConversationRisk(conversationRisk)
  );

  if (state.previousReflection) {
    blocks.push("", formatPreviousReflection(state.previousReflection));
  }

  const systemPrompt = blocks.join("\n").trim();
  const userMessage = utterance.lexicalNormalized ?? utterance.lexical;

  return {
    systemPrompt,
    userMessage,
    systemPayload: {
      utterance,
      intentForecast,
      activeSubgraph,
      responseSpec,
      toolContext,
      conversationRisk,
      previousReflection: state.previousReflection ?? undefined,
    },
  };
}

/**
 * Lift plain transcript + optional base prompt into minimal CognitionStatePartial.
 * Use when you still have User speech → ASR → text but want to move toward cognition-aware prompts.
 */
export function utteranceFromTranscript(
  transcript: string,
  overrides?: Partial<UtteranceState>
): UtteranceState {
  return {
    lexical: transcript,
    lexicalNormalized: transcript.trim(),
    ...overrides,
  };
}
