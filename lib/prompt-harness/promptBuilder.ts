/**
 * Selects topology blocks based on capabilities and failures.
 * Returns ordered list of block content strings for compilation.
 */

import type { Capabilities, Failures } from "./types";
import {
  SYMBOL_CAPTURE,
  PHONETIC_RULE,
  EXECUTION_GATE,
  NOISE_RECOVERY,
  READBACK,
  TOOL_ALIGNMENT,
} from "./topologyBlocks";

/**
 * Select which topology blocks to include based on capabilities and failures.
 * Returns block content in insertion order (no duplicates).
 */
export function buildPrompt(capabilities: Capabilities, failures: Failures): string[] {
  const blocks: string[] = [];
  const seen = new Set<string>();

  function add(block: string, id: string) {
    if (!seen.has(id)) {
      seen.add(id);
      blocks.push(block.trim());
    }
  }

  if (capabilities.capture_mode === "symbolic") {
    add(SYMBOL_CAPTURE, "SYMBOL_CAPTURE");
    add(PHONETIC_RULE, "PHONETIC_RULE");
  }

  if (failures.semantic_normalization) {
    add(EXECUTION_GATE, "EXECUTION_GATE");
  }

  if (capabilities.noise_tolerance === "high") {
    add(NOISE_RECOVERY, "NOISE_RECOVERY");
  }

  if (capabilities.execution_dependency) {
    add(TOOL_ALIGNMENT, "TOOL_ALIGNMENT");
  }

  if (capabilities.confirmation_required) {
    add(READBACK, "READBACK");
  }

  return blocks;
}
