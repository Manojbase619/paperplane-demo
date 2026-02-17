/**
 * POST /api/start-ultravox-call
 * Ultravox-native POC: use_case → prompt-generator → Ultravox /api/calls
 * Returns joinUrl to open in browser.
 */
import { NextResponse } from "next/server";
import { ensureNoRoleAcknowledgment } from "@/lib/prompt-compiler";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;

const DISPATCH_TOOL = {
  temporaryTool: {
    modelToolName: "dispatch_vehicle",
    description: "Assign dispatch to vehicle. Call when user provides a vehicle ID.",
    dynamicParameters: [
      {
        name: "vehicle_id",
        location: "PARAMETER_LOCATION_BODY",
        schema: { type: "string" },
        required: true,
      },
    ],
  },
};

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

    if (!ULTRAVOX_API_KEY) {
      return NextResponse.json(
        { error: "ULTRAVOX_API_KEY not set" },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (req.headers.get("host")
        ? `http://${req.headers.get("host")}`
        : "http://localhost:3000");

    const promptRes = await fetch(`${baseUrl}/api/prompt-generator`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ use_case: useCase }),
    });

    if (!promptRes.ok) {
      const err = await promptRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Prompt generation failed" },
        { status: promptRes.status }
      );
    }

    const { systemPrompt } = await promptRes.json();
    const rawPrompt =
      typeof systemPrompt === "string" && systemPrompt.trim()
        ? systemPrompt.trim()
        : "You are a logistics assistant. Capture vehicle IDs from the user and call the dispatch_vehicle tool when a vehicle ID is provided. Confirm alphanumeric IDs by repeating them back.";
    const prompt = ensureNoRoleAcknowledgment(rawPrompt);

    const uvRes = await fetch("https://api.ultravox.ai/api/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ULTRAVOX_API_KEY,
      },
      body: JSON.stringify({
        systemPrompt: prompt,
        selectedTools: [DISPATCH_TOOL],
      }),
    });

    const data = await uvRes.json();

    if (!uvRes.ok) {
      console.error("Ultravox create call error:", uvRes.status, data);
      return NextResponse.json(
        {
          error: "Ultravox call creation failed",
          status: uvRes.status,
          body: data,
        },
        { status: uvRes.status }
      );
    }

    const joinUrl = data?.joinUrl ?? data?.join_url ?? null;

    return NextResponse.json({
      ok: true,
      joinUrl,
      callId: data?.callId ?? data?.call_id ?? null,
      call: data,
    });
  } catch (e) {
    console.error("start-ultravox-call error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 }
    );
  }
}
