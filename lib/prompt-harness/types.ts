/**
 * Shared types for the prompt harness layer.
 */

export type CaptureMode = "semantic" | "symbolic";
export type NoiseTolerance = "low" | "high";

export interface Capabilities {
  capture_mode: CaptureMode;
  noise_tolerance: NoiseTolerance;
  execution_dependency: boolean;
  confirmation_required: boolean;
  pronunciation_required: boolean;
  memory_required: boolean;
}

export type FailureKind =
  | "asr_drift"
  | "semantic_normalization"
  | "hallucinated_completion"
  | "tool_schema_mismatch"
  | "phonetic_ambiguity";

export interface Failures {
  asr_drift: boolean;
  semantic_normalization: boolean;
  hallucinated_completion: boolean;
  tool_schema_mismatch: boolean;
  phonetic_ambiguity: boolean;
}

export interface Layers {
  asr: FailureKind[];
  llm: FailureKind[];
  router: FailureKind[];
  tts: FailureKind[];
}

export type TopologyBlockId =
  | "SYMBOL_CAPTURE"
  | "PHONETIC_RULE"
  | "EXECUTION_GATE"
  | "NOISE_RECOVERY"
  | "READBACK"
  | "TOOL_ALIGNMENT";

export interface PromptTrace {
  capabilities: Capabilities;
  failures: Failures;
  layers: Layers;
  topology_blocks_count: number;
}
