/**
 * Enhanced Ultravox Webhook Handler
 *
 * Handles call lifecycle events:
 * - call.started: Logs and confirms
 * - call.ended: Fetches transcript, stores messages, generates summaries
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/database";
import { storeCallMessages, updateCallEnded } from "@/lib/db-helpers";
import { generateAndStoreSummaries } from "@/lib/summary-generation";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;

export async function POST(req: Request) {
  const supabase = getSupabase();

  try {
    // ============================================
    // PARSE WEBHOOK PAYLOAD
    // ============================================
    const payload = await req.json();
    const eventType = payload?.event?.type;
    const call = payload?.event?.call;
    const callId = call?.id;

    if (!eventType || !callId) {
      console.log("⚠️ Missing eventType or callId in webhook payload");
      return NextResponse.json({ ok: true });
    }

    console.log(`📡 Webhook received: ${eventType} for call ${callId}`);

    // ============================================
    // EVENT: call.started
    // ============================================
    if (eventType === "call.started") {
      console.log(`✅ Call started: ${callId}`);

      // Call record already created in /api/calls/create
      // Just log for monitoring
      return NextResponse.json({ ok: true, event: "call.started" });
    }

    // ============================================
    // EVENT: call.ended
    // ============================================
    if (eventType === "call.ended") {
      console.log(`🏁 Call ended: ${callId}, reason: ${call?.endReason || "unknown"}`);

      // Get call details from our database (to get user_id)
      const { data: callRecord } = await supabase
        .from("calls")
        .select("user_id, phone_number")
        .eq("call_id", callId)
        .maybeSingle();

      const userId = callRecord?.user_id;
      const phoneNumber = callRecord?.phone_number;

      // Update call status
      await updateCallEnded(callId, new Date().toISOString(), call?.endReason);

      console.log(`  └─ Updated call status in database`);

      // ============================================
      // FETCH TRANSCRIPT FROM ULTRAVOX
      // ============================================
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

          // Handle different response formats
          messages = messagesData.results || messagesData.messages || messagesData || [];

          console.log(`  └─ Fetched ${messages.length} messages from Ultravox`);

        } else {
          console.error(`  └─ Failed to fetch messages: ${messagesResponse.status}`);
        }

      } catch (error) {
        console.error("  └─ Error fetching transcript:", error);
      }

      // ============================================
      // STORE MESSAGES IN DATABASE
      // ============================================
      if (messages.length > 0 && userId) {
        try {
          await storeCallMessages(callId, messages);
          console.log(`  └─ Stored ${messages.length} messages in database`);

          // ============================================
          // GENERATE SUMMARIES (async, non-blocking)
          // ============================================
          // Format messages for summary generation
          const formattedMessages = messages
            .filter((msg) =>
              msg.role === "MESSAGE_ROLE_USER" ||
              msg.role === "MESSAGE_ROLE_AGENT"
            )
            .map((msg) => ({
              role: msg.role.replace("MESSAGE_ROLE_", "").toLowerCase(),
              text: msg.text || "",
              medium: msg.medium || "voice",
              ordinal: 0, // Will be set during insertion
            }));

          // Generate summaries in background (don't block webhook response)
          if (formattedMessages.length > 0) {
            generateAndStoreSummaries(callId, userId, formattedMessages)
              .then(() => {
                console.log(`  └─ ✅ Summaries generated for call ${callId}`);
              })
              .catch((error) => {
                console.error(`  └─ ❌ Summary generation failed:`, error);
              });
          }

        } catch (error) {
          console.error("  └─ Error storing messages:", error);
        }
      }

      return NextResponse.json({
        ok: true,
        event: "call.ended",
        messagesStored: messages.length,
        userId,
      });
    }

    // ============================================
    // OTHER EVENTS (log and acknowledge)
    // ============================================
    console.log(`ℹ️ Unhandled event type: ${eventType}`);
    return NextResponse.json({ ok: true, event: eventType });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);

    // Always return 200 to acknowledge webhook
    // (Ultravox will retry on failure)
    return NextResponse.json({
      ok: true,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

// ============================================
// WEBHOOK VERIFICATION (for production)
// ============================================
// To enable webhook signature verification, uncomment this:
/*
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Add at the beginning of POST():
const signature = req.headers.get('x-ultravox-signature');
const webhookSecret = process.env.ULTRAVOX_WEBHOOK_SECRET;

if (webhookSecret && signature) {
  const body = await req.text();
  const isValid = verifyWebhookSignature(body, signature, webhookSecret);

  if (!isValid) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
  }

  // Re-parse JSON after reading text
  payload = JSON.parse(body);
}
*/
