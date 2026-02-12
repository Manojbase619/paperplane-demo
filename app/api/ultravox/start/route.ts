import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.ULTRAVOX_API_KEY;
  const agentId = process.env.ULTRAVOX_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { ok: false, error: "Missing Ultravox env vars" },
      { status: 200 }
    );
  }

  let customerName = "Basethesis User";
  let phoneNumber: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.customerName && typeof body.customerName === "string") {
      customerName = body.customerName.trim() || customerName;
    }
    if (body?.phoneNumber && typeof body.phoneNumber === "string") {
      phoneNumber = body.phoneNumber.trim() || undefined;
    }
  } catch {
    // use defaults
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
            customerName,
            accountType: "Premium",
            ...(phoneNumber && { phoneNumber }),
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
