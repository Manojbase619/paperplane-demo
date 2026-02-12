import { NextResponse } from "next/server";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_BASE = process.env.ULTRAVOX_API_BASE_URL ?? "https://api.ultravox.ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentId = (body.agentId as string)?.trim();
    const prompt = typeof body.prompt === "string" ? body.prompt : "";

    if (!agentId) {
      return NextResponse.json(
        { ok: false, error: "agentId required" },
        { status: 400 }
      );
    }

    if (!ULTRAVOX_API_KEY) {
      console.warn("ULTRAVOX_API_KEY not set; skipping sync");
      return NextResponse.json({ ok: true, synced: false });
    }

    const res = await fetch(`${ULTRAVOX_BASE}/api/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ULTRAVOX_API_KEY,
      },
      body: JSON.stringify({ systemPrompt: prompt }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("Ultravox agent update failed:", res.status, text);
      return NextResponse.json({
        ok: false,
        error: text || "Ultravox update failed",
        status: res.status,
      });
    }

    return NextResponse.json({ ok: true, synced: true });
  } catch (e) {
    console.error("update-agent error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
