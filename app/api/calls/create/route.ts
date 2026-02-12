/**
 * Ultravox Call Creation API
 * Ultravox = Voice transport
 * OpenAI (via webhook) = Brain
 */

import { NextResponse } from "next/server";
import {
  findOrCreateUser,
  getLastCallForUser,
  getCallSummary,
  updateUserLastCall,
  createCallRecord,
  createRuntimeCallSession,
  formatMessagesForUltravox,
  createContextMessage,
  getUserByPhone,
  ONE_HOUR,
  ONE_DAY,
} from "@/lib/db-helpers";
import { getStore } from "@/lib/store";
import { getDateKey } from "@/lib/quota";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_AGENT_ID = process.env.ULTRAVOX_AGENT_ID;

/** GET: return last call for the given phone (for dashboard) */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    if (!phone?.trim()) {
      return NextResponse.json({ lastCall: null }, { status: 200 });
    }
    const user = await getUserByPhone(phone.trim());
    if (!user) {
      return NextResponse.json({ lastCall: null }, { status: 200 });
    }
    const userId = (user as { id?: string; user_id?: string }).id ?? (user as { user_id?: string }).user_id;
    if (!userId) {
      return NextResponse.json({ lastCall: null }, { status: 200 });
    }
    const lastCall = await getLastCallForUser(userId);
    if (!lastCall) {
      return NextResponse.json({ lastCall: null }, { status: 200 });
    }
    return NextResponse.json({
      lastCall: {
        callId: lastCall.call_id,
        startedAt: lastCall.started_at,
        outcome: lastCall.outcome ?? undefined,
      },
    });
  } catch (e) {
    console.warn("GET /api/calls/create error:", e);
    return NextResponse.json({ lastCall: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneNumber = body?.phoneNumber;
    const prompt: string | undefined =
      typeof body?.prompt === "string" ? body.prompt.trim() || undefined : undefined;
    const agentId: string | undefined =
      typeof body?.agentId === "string" ? body.agentId.trim() || undefined : undefined;

    if (!phoneNumber) {
      return NextResponse.json(
        { ok: false, error: "Phone number required" },
        { status: 400 }
      );
    }

    console.log("=================================");
    console.log("📞 Call creation request:", phoneNumber);
    if (prompt) console.log("📝 Custom prompt:", prompt.slice(0, 80) + (prompt.length > 80 ? "…" : ""));
    console.log("Using Agent ID:", ULTRAVOX_AGENT_ID);
    console.log("=================================");

    // STEP 1 — Find or create user
    const user = await findOrCreateUser(phoneNumber);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Failed to create user" },
        { status: 500 }
      );
    }

    console.log(`👤 User: ${user.id}`);

    const lastCall = await getLastCallForUser(user.id);
    const recentSummary = lastCall
      ? await getCallSummary(lastCall.call_id)
      : null;

    const callAge = lastCall
      ? Date.now() - new Date(lastCall.started_at).getTime()
      : Infinity;

    // STEP 2 — Build Ultravox Request
    const ultravoxRequestBody: Record<string, any> = {
      recordingEnabled: true,
      maxDuration: "1800s",
      initialOutputMedium: "MESSAGE_MEDIUM_VOICE",
      metadata: {
        phoneNumber,
        userId: user.id,
        hasHistory: lastCall ? "true" : "false",
        source: "basethesis_voice",
        ...(prompt && { agentPrompt: prompt }),
      },
    };

    // Full prompt is stored in metadata and templateContext; webhook uses metadata.agentPrompt as the agent's system prompt (OpenAI brain).
    // Ultravox StartAgentCallRequest does not accept "systemPrompt" — only templateContext, firstSpeakerSettings, metadata, etc.
    if (prompt?.trim()) {
      const fullPrompt = prompt.trim();
      ultravoxRequestBody.templateContext = {
        ...(ultravoxRequestBody.templateContext || {}),
        agentPrompt: fullPrompt,
        systemPrompt: fullPrompt,
      };
      // First thing the user hears: a short greeting derived from the prompt
      const firstLine =
        fullPrompt.split(/\n/).find((l) => l.trim().length > 10)?.trim() ||
        "Hello! How can I help you today?";
      ultravoxRequestBody.firstSpeakerSettings = {
        agent: {
          prompt:
            firstLine.length > 200
              ? firstLine.slice(0, 197) + "..."
              : firstLine,
        },
      };
    }

    let hasInjectedContext = false;

    // Inject full history (<24h)
    if (
      lastCall &&
      callAge < ONE_DAY &&
      lastCall.messages &&
      lastCall.messages.length > 0
    ) {
      console.log("📝 Injecting full conversation history");

      ultravoxRequestBody.initialMessages = [
        ...formatMessagesForUltravox(lastCall.messages),
      ];

      hasInjectedContext = true;
    }

    // Inject summary (>=24h)
    else if (recentSummary && callAge >= ONE_DAY) {
      console.log("📊 Injecting summary context");

      ultravoxRequestBody.initialMessages = [
        {
          role: "MESSAGE_ROLE_USER",
          text: createContextMessage(recentSummary, user.name),
        },
      ];

      hasInjectedContext = true;
    }

    console.log(
      "Ultravox Request Body:",
      JSON.stringify(ultravoxRequestBody, null, 2)
    );

    // STEP 3 — Create Call
    const response = await fetch(
      `https://api.ultravox.ai/api/agents/${ULTRAVOX_AGENT_ID}/calls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ULTRAVOX_API_KEY!,
        },
        body: JSON.stringify(ultravoxRequestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Ultravox API error:", errorText);

      return NextResponse.json(
        { ok: false, error: "Failed to create call" },
        { status: 500 }
      );
    }

    const callData = await response.json();

    const userIdForDb = (user as { id?: string; user_id?: string }).id ?? (user as { user_id?: string }).user_id;

    await createCallRecord({
      call_id: callData.callId,
      user_id: userIdForDb!,
      phone_number: phoneNumber,
      source: "ultravox",
      status: "active",
      started_at: new Date().toISOString(),
      metadata: {
        joinUrl: callData.joinUrl,
        contextType: hasInjectedContext
          ? callAge < ONE_DAY
            ? "full_history"
            : "summary"
          : "none",
        ...(prompt && { agentPrompt: prompt }),
        ...(agentId && { agentId }),
      },
    });

    // Runtime engine: link call → agent so webhook uses AgentSpec + memory
    if (agentId) {
      try {
        await createRuntimeCallSession({
          call_id: callData.callId,
          agent_id: agentId,
          user_id: userIdForDb ?? null,
          state_json: {},
        });
        console.log(`🔗 Runtime session created for agent ${agentId}`);
      } catch (runtimeErr) {
        console.warn("Runtime call session create failed (non-fatal):", runtimeErr);
      }
    }

    // Create call_session and reserve daily usage so admin dashboard reflects live data
    try {
      const store = getStore();
      const usageDate = getDateKey(new Date());
      await store.createCallSession({
        phone: phoneNumber,
        startTime: new Date(),
        metadata: { call_id: callData.callId },
      });
      await store.incrementDailyUsage(phoneNumber.replace(/\D/g, ""), usageDate, 1, 0);
    } catch (storeErr) {
      console.warn("Store session/usage update failed (non-fatal):", storeErr);
    }

    await updateUserLastCall(userIdForDb!);

    console.log(`✅ Call created: ${callData.callId}`);

    return NextResponse.json({
      ok: true,
      callId: callData.callId,
      joinUrl: callData.joinUrl,
    });
  } catch (error) {
    console.error("❌ Call creation error:", error);

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
