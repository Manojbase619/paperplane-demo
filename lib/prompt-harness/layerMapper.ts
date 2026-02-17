/**
 * Maps failure modes to voice architecture layers (asr, llm, router, tts).
 * Stateless.
 */

import type { Failures, Layers } from "./types";
import type { FailureKind } from "./types";

/**
 * Map failures to which pipeline layers they affect.
 */
export function mapLayers(failures: Failures): Layers {
  const asr: FailureKind[] = [];
  const llm: FailureKind[] = [];
  const router: FailureKind[] = [];
  const tts: FailureKind[] = [];

  if (failures.asr_drift) asr.push("asr_drift");
  if (failures.semantic_normalization) llm.push("semantic_normalization");
  if (failures.hallucinated_completion) llm.push("hallucinated_completion");
  if (failures.tool_schema_mismatch) router.push("tool_schema_mismatch");
  if (failures.phonetic_ambiguity) {
    asr.push("phonetic_ambiguity");
    tts.push("phonetic_ambiguity");
  }

  return { asr, llm, router, tts };
}
