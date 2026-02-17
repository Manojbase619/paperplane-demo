/**
 * POST /api/prompt-generator
 * Human-like prompt generator: use case → capability → risk → behaviour policies → systemPrompt + trace.
 * No OpenAI; stateless; for Ultravox systemPrompt field.
 */
import { NextResponse } from "next/server";

// --- Types ---

export type NoiseLevel = "low" | "high";

export interface Capability {
  symbolic_capture: boolean;
  noise: NoiseLevel;
  execution_required: boolean;
}

export interface Risk {
  semantic_loss: boolean;
  action_risk: boolean;
  hearing_uncertainty: boolean;
}

export interface Trace {
  capability: Capability;
  risk: Risk;
  policies_applied_count: number;
}

export interface PromptGeneratorResponse {
  systemPrompt: string;
  trace: Trace;
}

// --- Behaviour policy constants ---

const CHARACTER_CONFIRMATION = `Always confirm identifiers character by character before proceeding.`;

const EXECUTION_DELAY = `Do not perform any tool execution until user confirmation is received.`;

const REPEAT_REQUEST = `If identifier capture confidence is low request user to repeat slowly.`;

const BASE_PROMPT = "You are a dispatch assistant.";

// --- 1. Capability detection ---

function detectCapability(use_case: string): Capability {
  const lower = use_case.toLowerCase();

  const symbolicCapture =
    /\b(vehicle\s*ids?|code|plate|alphanumeric)\b/i.test(lower);

  const noiseHigh = /\b(noise|noisy|calls?|environment)\b/i.test(lower);

  const executionRequired = /\b(dispatch|assign|execute)\b/i.test(lower);

  return {
    symbolic_capture: symbolicCapture,
    noise: noiseHigh ? "high" : "low",
    execution_required: executionRequired,
  };
}

// --- 2. Risk detection ---

function detectRisk(capability: Capability): Risk {
  return {
    semantic_loss: capability.symbolic_capture,
    action_risk: capability.execution_required,
    hearing_uncertainty: capability.noise === "high",
  };
}

// --- 3. Policy selection ---

function selectPolicies(risk: Risk): string[] {
  const policies: string[] = [];
  if (risk.semantic_loss) policies.push(CHARACTER_CONFIRMATION);
  if (risk.action_risk) policies.push(EXECUTION_DELAY);
  if (risk.hearing_uncertainty) policies.push(REPEAT_REQUEST);
  return policies;
}

// --- 4. Prompt compilation ---

function compilePrompt(selectedPolicies: string[]): string {
  const parts = [BASE_PROMPT, ...selectedPolicies];
  return parts.join("\n");
}

// --- API handler ---

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const useCase =
      typeof body?.use_case === "string" ? body.use_case.trim() : "";

    if (!useCase) {
      return NextResponse.json(
        { error: "use_case is required" },
        { status: 400 }
      );
    }

    const capability = detectCapability(useCase);
    const risk = detectRisk(capability);
    const policies = selectPolicies(risk);
    const systemPrompt = compilePrompt(policies);

    const trace: Trace = {
      capability,
      risk,
      policies_applied_count: policies.length,
    };

    const response: PromptGeneratorResponse = { systemPrompt, trace };
    return NextResponse.json(response);
  } catch (e) {
    console.error("Prompt generator error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
