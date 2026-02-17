/**
 * Optional delayed greeting endpoint. The main webhook now sends greeting only on
 * call.joined (when call is active), so this route is no longer triggered by
 * call.started. Kept for manual/legacy use; call status should be checked before
 * sending to avoid 422 "Call is not active".
 */
export const runtime = "nodejs";
export const maxDuration = 15;

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const INITIAL_DELAY_MS = 3000;
const RETRY_INTERVAL_MS = 3500;
const MAX_ATTEMPTS = 4;

import { NextResponse } from "next/server";
import { getCallByCallId } from "@/lib/db-helpers";
import { extractGreetingFromCompiledPrompt } from "@/lib/prompt-compiler";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const callId = body?.callId;
    if (!callId || typeof callId !== "string") {
      return NextResponse.json({ error: "callId required" }, { status: 400 });
    }

    if (!ULTRAVOX_API_KEY) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const callRecord = await getCallByCallId(callId);
    const prompt =
      callRecord?.metadata?.agentPrompt ??
      (typeof callRecord?.metadata?.agent_prompt === "string"
        ? callRecord.metadata.agent_prompt
        : null);
    const greeting = prompt
      ? extractGreetingFromCompiledPrompt(prompt)
      : "Hello! How can I help you today?";
    const toSpeak = greeting.length > 280 ? greeting.slice(0, 277) + "…" : greeting;

    await sleep(INITIAL_DELAY_MS);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const sendRes = await fetch(
        `https://api.ultravox.ai/api/calls/${callId}/send_data_message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": ULTRAVOX_API_KEY,
          },
          body: JSON.stringify({
            type: "forced_agent_message",
            content: toSpeak,
            urgency: "immediate",
          }),
        }
      );

      if (sendRes.ok) {
        console.log(`🔊 [voice] Delayed greeting sent for call ${callId} (attempt ${attempt})`);
        return NextResponse.json({ ok: true });
      }

      const errText = await sendRes.text();
      const isNotActive = sendRes.status === 422 && /not active/i.test(errText);

      if (isNotActive && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_INTERVAL_MS);
        continue;
      }

      console.warn(`🔊 [voice] Delayed greeting failed ${callId}:`, sendRes.status, errText.slice(0, 200));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.warn("[voice] send-greeting error:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
