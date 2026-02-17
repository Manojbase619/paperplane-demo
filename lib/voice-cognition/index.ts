/**
 * Voice Cognition Stack — 6-layer cognitive audio system
 *
 * Prompt = f(runtime cognition state), not static system text.
 *
 * Layers:
 * 1. Parallel Perception → UtteranceState(t)
 * 2. Intent Predictor (streaming) → IntentForecast, ResponseBlueprint
 * 3. Dialogue State Graph → ConversationGraph, ActiveSubgraph(t)
 * 4. Response Composer → ResponseSpec(t)
 * 5. Incremental generation (orchestration)
 * 6. Reflection → TurnReflection
 *
 * Metrics to optimize (not WER/BLEU):
 * - Conversational Recovery Time (CRT)
 * - Interruptibility Loss (IL)
 * - Turn Prediction Accuracy (TPA)
 * - Mid-Speech Repair Success (MSR)
 * - Goal Completion Latency (GCL)
 */

export * from "./schema";
export * from "./runtime-prompt";
