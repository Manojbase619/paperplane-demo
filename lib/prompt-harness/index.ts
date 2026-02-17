/**
 * Prompt harness: use_case → capabilities → failures → layers → topology → system prompt.
 * Re-exports for use in API routes.
 */

export { extractCapabilities } from "./capabilityExtractor";
export { mapFailures } from "./failureMapper";
export { mapLayers } from "./layerMapper";
export { buildPrompt } from "./promptBuilder";
export { compilePrompt } from "./compilePrompt";
export * from "./topologyBlocks";
export type { Capabilities, Failures, Layers, PromptTrace } from "./types";
