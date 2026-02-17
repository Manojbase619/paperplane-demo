/**
 * Voice Cognition Stack — Runtime Schema
 *
 * Prompt = f(runtime cognition state), NOT static system text.
 * These types define the 6-layer pipeline that feeds the dynamic prompt.
 *
 * Layer 1: Parallel Perception → UtteranceState(t)
 * Layer 2: Intent Predictor → IntentForecast, ResponseBlueprint
 * Layer 3: Dialogue State → ConversationGraph, ActiveSubgraph(t)
 * Layer 4: Response Composer → ResponseSpec(t)
 * Layer 5: (Incremental pipeline is orchestration; uses ResponseSpec)
 * Layer 6: Reflection → TurnReflection (updates policy for next turn)
 */

// ─── Layer 1: Parallel Perception (NOT just ASR) ───────────────────────────

export type DialogueAct =
  | "question"
  | "request"
  | "clarification"
  | "confirmation"
  | "rejection"
  | "acknowledgment"
  | "correction"
  | "chitchat"
  | "goodbye"
  | "other";

/** Output of parallel perception: speech → rich state, not plain text. */
export interface UtteranceState {
  /** Lexical transcript (what was said). */
  lexical: string;
  /** Normalized / cleaned for downstream. */
  lexicalNormalized?: string;
  /** Emotional vector (e.g. from prosody/wav2vec-style encoder). */
  emotionalVector?: number[];
  /** Dominant emotion label for prompt conditioning. */
  emotionLabel?: "calm" | "frustrated" | "urgent" | "neutral" | "confused" | "satisfied" | string;
  /** Inferred speaker intent (high level). */
  speakerIntent?: string;
  /** Hesitation/filler markers (e.g. "um", pauses). */
  hesitationMarkers?: Array<{ at: number; type: "filler" | "pause" | "restart" }>;
  /** Dialogue act classification. */
  dialogueAct?: DialogueAct;
  /** 0–1 urgency. */
  urgencyScore?: number;
  /** Probability user is about to interrupt (for barge-in). */
  interruptionProbability?: number;
  /** Acoustic/ASR confidence 0–1. */
  acousticConfidence?: number;
  /** Prosody: pitch contour summary (e.g. "rising", "falling", "flat"). */
  pitchContour?: string;
  /** Timestamp of utterance start (ms). */
  t?: number;
}

// ─── Layer 2: Real-Time Intent Predictor (streaming) ───────────────────────

/** Forecast produced while user is still speaking. */
export interface IntentForecast {
  /** Predicted primary intent. */
  predictedIntent: string;
  /** Whether we expect to need clarification. */
  clarificationNeeded?: boolean;
  /** Suggested response structure: "stepwise" | "single_answer" | "list" | "confirm_then_act". */
  responseStructure?: string;
  /** Tools/functions likely needed. */
  requiredToolIds?: string[];
  /** Confidence of forecast 0–1. */
  confidence?: number;
  /** Partial transcript span this was derived from. */
  fromPartialTranscript?: string;
}

/** Blueprint for the response — plan before user finishes. */
export interface ResponseBlueprint {
  intent: string;
  clarificationNeeded: boolean;
  responseStructure: "stepwise" | "single_answer" | "list" | "confirm_then_act" | "repair" | "other";
  toolIds: string[];
  /** Optional: key points to cover (for stepwise). */
  keyPoints?: string[];
}

// ─── Layer 3: Dialogue State Graph (NOT chat history) ──────────────────────

export interface GoalNode {
  id: string;
  /** Short label (e.g. "book_meeting", "get_balance"). */
  goal: string;
  /** "active" | "resolved" | "abandoned" | "deferred". */
  status: "active" | "resolved" | "abandoned" | "deferred";
  /** User commitment or explicit confirmation. */
  userCommitment?: string;
  createdAt: number;
  updatedAt: number;
  /** Decay weight for relevance (e.g. 0–1, older = lower). */
  temporalWeight?: number;
}

export interface ConversationEdge {
  from: string;
  to: string;
  /** Relationship: "follows" | "corrects" | "clarifies" | "abandons". */
  type: "follows" | "corrects" | "clarifies" | "abandons";
  at: number;
}

export interface ConversationGraph {
  nodes: GoalNode[];
  edges: ConversationEdge[];
  /** Unresolved intents to revisit. */
  unresolvedIntents: string[];
  /** Emotional trajectory (recent emotions). */
  emotionalTrajectory?: string[];
  /** Correction chains (e.g. user said X then corrected to Y). */
  correctionChains?: Array<{ original: string; corrected: string; at: number }>;
  /** Trust/alignment score 0–1 (e.g. from reflection). */
  trustScore?: number;
}

/** Subgraph passed to LLM: only active + relevant goals. */
export interface ActiveSubgraph {
  goals: GoalNode[];
  edges: ConversationEdge[];
  unresolvedIntents: string[];
  /** One-line summary for prompt. */
  summary?: string;
}

// ─── Layer 4: Response Composer (before LLM) ───────────────────────────────

/** Spec for how to render the response; LLM fills only semantic payload. */
export interface ResponseSpec {
  intent: string;
  tone: "neutral" | "empathetic" | "concise" | "warm" | "formal" | string;
  speechRate: "slow" | "normal" | "fast";
  interruptionSafe: boolean;
  chunkable: boolean;
  repairable: boolean;
  emotionTarget: string;
  /** Semantic priority: "stepwise" | "single_block" | "bullet_summary". */
  semanticPriority: "stepwise" | "single_block" | "bullet_summary";
  /** Max segments if chunkable (for TTS batching). */
  maxChunkSegments?: number;
}

// ─── Layer 6: Reflection (post-turn) ──────────────────────────────────────

export interface TurnReflection {
  /** Was response aligned with predicted intent? */
  intentAligned: boolean;
  /** Was tone/emotion as expected? */
  emotionalExpectationMet?: boolean;
  /** Did we advance conversation goal? */
  goalAdvanced?: boolean;
  /** Suggested updates for next turn. */
  policyUpdates?: {
    tonePolicy?: string;
    verbosityPolicy?: "more" | "less" | "same";
    userPatienceEstimate?: "low" | "medium" | "high";
    speakingSpeed?: "slower" | "same" | "faster";
    explanationDepth?: "minimal" | "normal" | "detailed";
  };
}

// ─── Tool & risk (for DynamicPrompt) ───────────────────────────────────────

export interface ToolContext {
  availableToolIds: string[];
  lastUsedToolId?: string;
  lastToolResult?: string;
  /** Tool-specific params to inject. */
  params?: Record<string, unknown>;
}

/** Risk of misunderstanding or user frustration. */
export interface ConversationRiskScore {
  score: number;
  reasons?: string[];
  /** Suggested mitigation: "clarify" | "shorten" | "confirm" | "none". */
  mitigation?: "clarify" | "shorten" | "confirm" | "none";
}

// ─── Composite: what the dynamic prompt is a function of ───────────────────

/**
 * Runtime cognition state at time t.
 * DynamicPrompt = f(CognitionState).
 */
export interface CognitionState {
  /** Layer 1: current user utterance state (never plain text only). */
  utterance: UtteranceState;
  /** Layer 2: intent forecast (may be from streaming predictor). */
  intentForecast: IntentForecast | ResponseBlueprint;
  /** Layer 3: active subgraph of dialogue state. */
  activeSubgraph: ActiveSubgraph;
  /** Layer 4: how to compose the response. */
  responseSpec: ResponseSpec;
  /** Tools and last results. */
  toolContext: ToolContext;
  /** Risk and mitigation. */
  conversationRisk: ConversationRiskScore;
  /** Optional: reflection from previous turn (for adaptation). */
  previousReflection?: TurnReflection;
  /** Call/session id for logging. */
  callId?: string;
  /** Agent spec id (for domain rules). */
  agentId?: string;
}

/** Minimal shape when layers are not yet implemented (gradual adoption). */
export interface CognitionStatePartial {
  utterance: UtteranceState;
  intentForecast?: IntentForecast | ResponseBlueprint | null;
  activeSubgraph?: ActiveSubgraph | null;
  responseSpec?: ResponseSpec | null;
  toolContext?: ToolContext | null;
  conversationRisk?: ConversationRiskScore | null;
  previousReflection?: TurnReflection | null;
  callId?: string;
  agentId?: string;
}
