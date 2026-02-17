/**
 * Converts natural language use_case into structured capabilities.
 * Stateless, no external deps.
 */

import type { Capabilities, CaptureMode, NoiseTolerance } from "./types";

const SYMBOLIC_KEYWORDS = [
  "vehicle id",
  "vehicle ids",
  "code",
  "alphanumeric",
  "plate",
  "number",
  "numbers",
  "dispatch",
  "id",
  "ids",
  "reference",
  "reference number",
  "tracking number",
];

const NOISY_KEYWORDS = ["noise", "noisy", "call", "environment", "field", "outdoor"];

const EXECUTION_KEYWORDS = ["dispatch", "route", "execute", "execution", "action", "trigger"];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keywords.some((k) => lower.includes(k));
}

/**
 * Extract capabilities from a natural language use_case string.
 */
export function extractCapabilities(useCase: string): Capabilities {
  const normalized = (useCase ?? "").trim().toLowerCase();

  const capture_mode: CaptureMode = containsAny(normalized, SYMBOLIC_KEYWORDS)
    ? "symbolic"
    : "semantic";

  const noise_tolerance: NoiseTolerance = containsAny(normalized, NOISY_KEYWORDS)
    ? "high"
    : "low";

  const execution_dependency = containsAny(normalized, EXECUTION_KEYWORDS);

  const confirmation_required =
    normalized.includes("confirm") ||
    normalized.includes("readback") ||
    normalized.includes("verify") ||
    normalized.includes("acknowledge");

  const pronunciation_required =
    capture_mode === "symbolic" ||
    normalized.includes("pronounce") ||
    normalized.includes("spell") ||
    normalized.includes("phonetic");

  const memory_required =
    normalized.includes("memory") ||
    normalized.includes("context") ||
    normalized.includes("remember") ||
    normalized.includes("history");

  return {
    capture_mode,
    noise_tolerance,
    execution_dependency,
    confirmation_required,
    pronunciation_required,
    memory_required,
  };
}
