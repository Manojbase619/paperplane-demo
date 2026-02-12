import { NextResponse } from "next/server";
import { runSimulation } from "@/lib/evals/simulate";
import { SCENARIOS, getAllScenarioIds } from "@/lib/evals";

export async function GET() {
  return NextResponse.json({
    scenarios: SCENARIOS.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
    })),
    scenarioIds: getAllScenarioIds(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const scenarioId = body.scenarioId as string;
    const persist = Boolean(body.persist !== false);
    const agentId = body.agentId ?? null;
    const promptVersion = body.promptVersion;

    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId required" },
        { status: 400 }
      );
    }

    const { scenario, transcript, evalResult } = await runSimulation({
      scenarioId,
      persist,
      agentId,
      promptVersion,
    });

    return NextResponse.json({
      ok: true,
      scenario: { id: scenario.id, name: scenario.name, category: scenario.category },
      transcript,
      evalResult,
    });
  } catch (e) {
    console.error("Evals simulate error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Simulation failed" },
      { status: 500 }
    );
  }
}
