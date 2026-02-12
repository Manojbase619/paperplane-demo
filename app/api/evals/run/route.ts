import { NextResponse } from "next/server";
import { runEvalOnCall } from "@/lib/evals";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const callId = body.callId as string | undefined;
    const transcript = body.transcript as Array<{ role: string; text: string }> | undefined;
    const scenarioId = body.scenarioId as string | undefined;
    const agentId = body.agentId as string | undefined;
    const promptVersion = body.promptVersion as string | undefined;
    const systemPromptSummary = body.systemPromptSummary as string | undefined;
    const scenarioDescription = body.scenarioDescription as string | undefined;
    const expectedOutcomes = body.expectedOutcomes as string[] | undefined;
    const persist = Boolean(body.persist !== false);

    if (!callId && !transcript?.length) {
      return NextResponse.json(
        { error: "Provide callId or transcript" },
        { status: 400 }
      );
    }

    const result = await runEvalOnCall({
      callId: callId || undefined,
      transcript: transcript?.map((m) => ({
        role: (m.role === "agent" || m.role === "user" || m.role === "system" ? m.role : "user") as "user" | "agent" | "system",
        text: String(m.text ?? ""),
      })),
      scenarioId: scenarioId || null,
      agentId: agentId || null,
      promptVersion,
      systemPromptSummary,
      scenarioDescription,
      expectedOutcomes,
      persist,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("Evals run error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Eval run failed" },
      { status: 500 }
    );
  }
}
