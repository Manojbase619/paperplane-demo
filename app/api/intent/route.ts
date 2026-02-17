/**
 * Intent capture API: receives use_case, runs prompt harness, returns system prompt + trace.
 * Stateless, Vercel-compatible, no DB or external deps.
 */

import { NextResponse } from "next/server";
import {
  extractCapabilities,
  mapFailures,
  mapLayers,
  buildPrompt,
  compilePrompt,
} from "@/lib/prompt-harness";
import type { PromptTrace } from "@/lib/prompt-harness";

export interface IntentRequestBody {
  use_case?: string;
}

export interface IntentResponseBody {
  systemPrompt: string;
  trace: PromptTrace;
}

export async function POST(req: Request): Promise<NextResponse<IntentResponseBody | { error: string }>> {
  try {
    const body = (await req.json()) as IntentRequestBody;
    const useCase = typeof body?.use_case === "string" ? body.use_case.trim() : "";

    const capabilities = extractCapabilities(useCase);
    const failures = mapFailures(capabilities);
    const layers = mapLayers(failures);
    const selectedBlocks = buildPrompt(capabilities, failures);
    const systemPrompt = compilePrompt(selectedBlocks);

    const trace: PromptTrace = {
      capabilities,
      failures,
      layers,
      topology_blocks_count: selectedBlocks.length,
    };

    return NextResponse.json({
      systemPrompt,
      trace,
    });
  } catch (e) {
    console.warn("POST /api/intent error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Intent processing failed" },
      { status: 500 }
    );
  }
}
