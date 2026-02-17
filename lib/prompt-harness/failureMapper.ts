/**
 * Maps capabilities into failure modes that the prompt topology must address.
 * Stateless.
 */

import type { Capabilities, Failures } from "./types";

/**
 * Map extracted capabilities to relevant failure modes.
 */
export function mapFailures(capabilities: Capabilities): Failures {
  const { capture_mode, noise_tolerance, execution_dependency, confirmation_required } =
    capabilities;

  return {
    asr_drift: noise_tolerance === "high",
    semantic_normalization: capture_mode === "semantic" || execution_dependency,
    hallucinated_completion: execution_dependency,
    tool_schema_mismatch: execution_dependency,
    phonetic_ambiguity: capture_mode === "symbolic",
  };
}
