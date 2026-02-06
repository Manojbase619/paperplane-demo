import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  const agentId = process.env.ULTRAVOX_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { ok: false, error: "Missing Ultravox env vars" },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(
      `https://api.ultravox.ai/api/agents/${agentId}/calls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          templateContext: {
            customerName: "Paperplane User",
            accountType: "Premium",
          },
        }),
      }
    );

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("Ultravox start error:", res.status, json);
      return NextResponse.json(
        {
          ok: false,
          error: "Ultravox returned non-OK status",
          status: res.status,
          body: json,
        },
        { status: 200 }
      );
    }

    const joinUrl = json?.joinUrl || json?.join_url || null;

    return NextResponse.json(
      {
        ok: true,
        joinUrl,
        call: json,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Ultravox start exception", err);
    return NextResponse.json(
      { ok: false, error: "Ultravox request failed" },
      { status: 200 }
    );
  }
}
