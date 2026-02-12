import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/database";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const eventType = (body.eventType as string) || "unknown";
    const rawAgentId = body.agentId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const agentId = typeof rawAgentId === "string" && uuidRegex.test(rawAgentId) ? rawAgentId : null;
    const callId = body.callId ?? null;
    const phoneNumber = body.phoneNumber ?? null;
    const payload = body.payload ?? {};

    const supabase = getSupabase();
    const { error } = await supabase.from("analytics_events").insert({
      agent_id: agentId,
      call_id: callId || null,
      phone_number: phoneNumber || null,
      event_type: eventType,
      payload,
    });

    if (error) {
      console.warn("analytics_events insert (table may not exist):", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.warn("Analytics events error:", e);
    return NextResponse.json({ ok: true });
  }
}
