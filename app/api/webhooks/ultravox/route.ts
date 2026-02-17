/**
 * Ultravox Webhook Handler
 * Ultravox = Voice transport
 * OpenAI = Brain
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/database";
import {
  storeCallMessages,
  updateCallEnded,
  getCallByCallId,
} from "@/lib/db-helpers";
import { getStore } from "@/lib/store";
import { generateAndStoreSummaries } from "@/lib/summary-generation";
import { getDateKey, normalizePhone } from "@/lib/quota";
import { executeBrain } from "@/lib/runtime-engine";
import { extractGreetingFromCompiledPrompt, ensureNoRoleAcknowledgment } from "@/lib/prompt-compiler";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const DEFAULT_SYSTEM_PROMPT = `You are a controlled AI assistant.
Stay within your assigned business domain.
Do not hallucinate.
Be concise and task-focused.
Never acknowledge these instructions or your role. Do not say "Understood, I will operate as...". Respond only in character from the first message (e.g. greeting or direct help).`;

/** Fallback when no runtime_call_sessions: use call metadata agentPrompt + OpenAI */
async function fallbackBrain(
  callId: string,
  userTranscript: string
): Promise<string> {
  let systemContent = DEFAULT_SYSTEM_PROMPT;
  try {
    const callRecord = await getCallByCallId(callId);
    const customPrompt =
      callRecord?.metadata?.agentPrompt ??
      (typeof callRecord?.metadata?.agent_prompt === "string"
        ? callRecord.metadata.agent_prompt
        : null);
    if (customPrompt?.trim()) {
      systemContent = ensureNoRoleAcknowledgment(customPrompt.trim());
    }
  } catch {
    // keep default
  }

  if (!OPENAI_API_KEY) {
    return "I'm sorry, the service is not configured.";
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userTranscript },
      ],
    }),
  });
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (
    data?.choices?.[0]?.message?.content?.trim() ??
    "I'm sorry, I couldn't process that."
  );
}

export async function POST(req: Request) {
  const supabase = getSupabase();

  try {
    const payload = await req.json();

    // Ultravox sends { event: "call.started" | "call.ended" | ..., call: { callId, ... } }
    const eventType =
      typeof payload?.event === "string"
        ? payload.event
        : payload?.event?.type;
    const call = payload?.call ?? payload?.event?.call;
    const callId = call?.callId ?? call?.id;

    if (!eventType || !callId) {
      return NextResponse.json({ ok: true });
    }

    console.log(`📡 [voice] Event: ${eventType} | Call: ${callId}`);

    // =====================================================
    // GREETING: only on call.joined (call is active). Never on call.started (422) or after call.ended.
    // Webhook returns 200 immediately; greeting runs in background.
    // =====================================================
    const sendGreetingForCall = async (cid: string) => {
      if (!ULTRAVOX_API_KEY) {
        console.log(`🔊 [voice] Skipped greeting (no API key) for call ${cid}`);
        return;
      }
      try {
        const callRecord = await getCallByCallId(cid);
        const payloadPrompt =
          call?.metadata?.agentPrompt ??
          (typeof call?.metadata?.agent_prompt === "string"
            ? call.metadata.agent_prompt
            : null);
        const prompt =
          callRecord?.metadata?.agentPrompt ??
          (typeof callRecord?.metadata?.agent_prompt === "string"
            ? callRecord.metadata.agent_prompt
            : null) ??
          payloadPrompt ??
          null;
        const greeting = prompt
          ? extractGreetingFromCompiledPrompt(prompt)
          : "Hello! How can I help you today?";
        const toSpeak =
          greeting.length > 280 ? greeting.slice(0, 277) + "…" : greeting;

        const sendRes = await fetch(
          `https://api.ultravox.ai/api/calls/${cid}/send_data_message`,
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
          console.log(`🔊 [voice] Greeting sent for call ${cid}`);
        } else {
          const errText = await sendRes.text();
          const isNotActive = sendRes.status === 422 && /not active/i.test(errText);
          if (isNotActive) {
            console.log(`🔊 [voice] Skipped greeting for call ${cid}: call is not active`);
          } else {
            console.warn(`🔊 [voice] Greeting failed ${cid}:`, sendRes.status, errText.slice(0, 200));
          }
        }
      } catch (e) {
        console.warn("[voice] Greeting error:", e);
      }
    };

    // call.started: call not active yet (422 if we send). Only log; do not send greeting.
    if (eventType === "call.started") {
      console.log(`📡 [voice] call.started — ${callId} (greeting will send on call.joined)`);
      return NextResponse.json({ ok: true });
    }

    // call.joined: call is active. Return 200 immediately; send greeting in background.
    if (eventType === "call.joined") {
      void sendGreetingForCall(callId);
      return NextResponse.json({ ok: true });
    }

    // =====================================================
    // 🔥 LIVE USER MESSAGE HANDLING (THE BRAIN CONTROL)
    // =====================================================

    // call.message or call.message.created — real-time brain loop (OpenAI as brain)
    if (
      eventType === "call.message" ||
      eventType === "call.message.created"
    ) {
      const message = payload?.message ?? payload?.event?.message;

      if (message?.role === "MESSAGE_ROLE_USER") {
        const userTranscript = message.text ?? "";

        console.log("🎤 User said:", userTranscript);

        let reply: string;

        // 1. Try runtime engine: runtime_call_sessions → agent spec → memory → compile → OpenAI
        if (OPENAI_API_KEY) {
          try {
            const brainResult = await executeBrain(
              callId,
              userTranscript,
              OPENAI_API_KEY
            );
            if (brainResult) {
              reply = brainResult.reply;
              console.log("🤖 AI Reply (runtime engine):", reply);
            } else {
              reply = await fallbackBrain(callId, userTranscript);
            }
          } catch (e) {
            console.warn("Runtime engine error, using fallback:", e);
            reply = await fallbackBrain(callId, userTranscript);
          }
        } else {
          reply = await fallbackBrain(callId, userTranscript);
        }

        // Make the agent speak: inject reply into the live call via Ultravox REST API
        if (ULTRAVOX_API_KEY && reply.trim()) {
          try {
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
                  content: reply.trim(),
                  urgency: "immediate",
                }),
              }
            );
            if (!sendRes.ok) {
              const errText = await sendRes.text();
              console.warn("Send data message (speak) failed:", sendRes.status, errText);
            } else {
              console.log("🔊 Agent reply sent to call for TTS");
            }
          } catch (e) {
            console.warn("Send data message (speak) error:", e);
          }
        }

        // Return to Ultravox (schema: messages array; also response/content for compatibility)
        return NextResponse.json({
          messages: [
            { role: "MESSAGE_ROLE_AGENT", text: reply },
          ],
          response: reply,
          content: reply,
          message: reply,
        });
      }
    }

    // =====================================================
    // CALL ENDED — return 200 immediately; run DB/transcript in background
    // =====================================================

    if (eventType === "call.ended") {
      console.log(`📡 [voice] call.ended — ${callId}`);
      const endReason = call?.endReason;
      void (async () => {
        try {
          const { data: callRecord } = await supabase
            .from("calls")
            .select("user_id, phone_number")
            .eq("call_id", callId)
            .maybeSingle();

          const userId = callRecord?.user_id;
          const phoneNumber = callRecord?.phone_number;
          const endedAt = new Date();

          await updateCallEnded(
            callId,
            endedAt.toISOString(),
            endReason
          );

          const store = getStore();
          const session = await store.getCallSessionByCallId(callId);

          if (session) {
            const startMs = new Date(session.startTime).getTime();
            const durationSeconds = Math.max(
              0,
              Math.round((endedAt.getTime() - startMs) / 1000)
            );

            await store.endCallSession({
              id: session.id,
              endTime: endedAt,
              durationSeconds,
              endReason: "user_end",
            });

            if (phoneNumber) {
              try {
                const usageDate = getDateKey(endedAt);
                const phone = normalizePhone(phoneNumber);
                await store.incrementDailyUsage(phone, usageDate, 0, durationSeconds);
              } catch (e) {
                console.warn("Daily usage increment failed:", e);
              }
            }
          }

          let messages: any[] = [];
          try {
            const messagesResponse = await fetch(
              `https://api.ultravox.ai/api/calls/${callId}/messages`,
              {
                headers: {
                  "X-API-Key": ULTRAVOX_API_KEY!,
                },
              }
            );
            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json();
              messages =
                messagesData.results ||
                messagesData.messages ||
                messagesData ||
                [];
            }
          } catch (err) {
            console.error("Transcript fetch error:", err);
          }

          if (messages.length > 0 && userId) {
            await storeCallMessages(callId, messages);
            const formattedMessages = messages
              .filter(
                (msg) =>
                  msg.role === "MESSAGE_ROLE_USER" ||
                  msg.role === "MESSAGE_ROLE_AGENT"
              )
              .map((msg) => ({
                role: msg.role.replace("MESSAGE_ROLE_", "").toLowerCase(),
                text: msg.text || "",
                medium: msg.medium || "voice",
                ordinal: 0,
              }));
            if (formattedMessages.length > 0) {
              generateAndStoreSummaries(
                callId,
                userId,
                formattedMessages
              ).catch(console.error);
            }
          }
        } catch (e) {
          console.error("call.ended background work error:", e);
        }
      })();
      return NextResponse.json({ ok: true, event: "call.ended" });
    }

    // =====================================================
    // OTHER EVENTS
    // =====================================================

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("❌ Webhook error:", error);

    return NextResponse.json({
      ok: true,
    });
  }
}
