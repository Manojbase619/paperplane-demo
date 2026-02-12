import { NextResponse } from "next/server";
import { getEvalResults } from "@/lib/evals/storage";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get("callId") ?? undefined;
    const evalRunId = searchParams.get("evalRunId") ?? undefined;
    const agentId = searchParams.get("agentId") ?? undefined;
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10) || 50);

    const results = await getEvalResults({
      call_id: callId,
      eval_run_id: evalRunId,
      agent_id: agentId,
      limit,
    });

    return NextResponse.json({ results });
  } catch (e) {
    console.error("Evals results error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load results" },
      { status: 500 }
    );
  }
}
