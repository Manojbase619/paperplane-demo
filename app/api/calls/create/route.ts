/**
 * Ultravox Call Creation API with Memory Support
 *
 * This endpoint creates Ultravox calls with conversation context injection.
 * It implements a three-tier memory strategy:
 * - Tier 1: priorCallId for immediate reconnection (<1hr)
 * - Tier 2: Full transcript for recent calls (<24hrs)
 * - Tier 3: Summary + templateContext for older calls
 */

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/database";
import {
  getUserByPhone,
  findOrCreateUser,
  getLastCallForUser,
  getCallSummary,
  updateUserLastCall,
  createCallRecord,
  formatMessagesForUltravox,
  createContextMessage,
  ONE_HOUR,
  ONE_DAY,
} from "@/lib/db-helpers";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_AGENT_ID = process.env.ULTRAVOX_AGENT_ID;

export async function POST(req: Request) {
  const supabase = getSupabase();

  try {
    // ============================================
    // STEP 1: Extract and validate phone number
    // ============================================
    const body = await req.json();
    const phoneNumber = body?.phoneNumber;

    if (!phoneNumber) {
      return NextResponse.json(
        { ok: false, error: "Phone number required", errorCode: "PHONE_REQUIRED" },
        { status: 400 }
      );
    }

    // Normalize phone number (basic validation)
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Invalid phone number", errorCode: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    console.log(`📞 Call creation request for phone: ${phoneNumber}`);

    // ============================================
    // STEP 2: Find or create user
    // ============================================
    const user = await findOrCreateUser(phoneNumber);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Failed to create user", errorCode: "USER_CREATE_FAILED" },
        { status: 500 }
      );
    }

    console.log(`👤 User: ${user.user_id} (${user.name || "No name"})`);

    // ============================================
    // STEP 3: Get conversation context
    // ============================================
    const lastCall = await getLastCallForUser(user.user_id);
    const recentSummary = lastCall ? await getCallSummary(lastCall.call_id) : null;

    // Calculate call age
    const callAge = lastCall ? Date.now() - new Date(lastCall.started_at).getTime() : Infinity;

    console.log(`📋 Last call: ${lastCall?.call_id || "None"}, Age: ${Math.floor(callAge / ONE_HOUR)}h ago`);

    // ============================================
    // STEP 4: Build Ultravox request with context
    // ============================================
    const ultravoxRequestBody: Record<string, any> = {
      recordingEnabled: true,
      maxDuration: "1800s", // 30 minutes
      metadata: {
        phoneNumber,
        userId: user.user_id,
        hasHistory: !!lastCall,
      },
    };

    let hasInjectedContext = false;

    // ============================================
    // TIER 1: Use priorCallId for immediate reconnection
    // ============================================
    if (lastCall && callAge < ONE_HOUR) {
      console.log("🔄 Tier 1: Using priorCallId for reconnection");

      // Use Ultravox's priorCallId feature
      const priorCallId = lastCall.call_id;

      const response = await fetch(
        `https://api.ultravox.ai/api/calls?priorCallId=${priorCallId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": ULTRAVOX_API_KEY!,
          },
          body: JSON.stringify({
            // Override what we need to change
            metadata: ultravoxRequestBody.metadata,
            recordingEnabled: ultravoxRequestBody.recordingEnabled,
            maxDuration: ultravoxRequestBody.maxDuration,
          }),
        }
      );

      if (response.ok) {
        const callData = await response.json();

        // Store call record
        await createCallRecord({
          call_id: callData.callId,
          user_id: user.user_id,
          phone_number: phoneNumber,
          source: "ultravox",
          status: "active",
          started_at: new Date().toISOString(),
          metadata: { priorCallId, joinUrl: callData.joinUrl },
        });

        await updateUserLastCall(user.user_id);

        console.log(`✅ Call created with priorCallId: ${callData.callId}`);

        return NextResponse.json({
          ok: true,
          callId: callData.callId,
          joinUrl: callData.joinUrl,
          hasHistory: true,
          contextType: "priorCallId",
        });
      } else {
        console.error("priorCallId request failed, falling back to manual injection");
      }
    }

    // ============================================
    // TIER 2: Full transcript for recent calls (<24hrs)
    // ============================================
    if (lastCall && callAge < ONE_DAY && lastCall.messages && lastCall.messages.length > 0) {
      console.log("📝 Tier 2: Injecting full conversation history");

      ultravoxRequestBody.initialMessages = [
        ...formatMessagesForUltravox(lastCall.messages),
        {
          role: "MESSAGE_ROLE_AGENT",
          text: "Welcome back! I see we were in the middle of planning your trip. Let's pick up where we left off.",
        },
      ];

      hasInjectedContext = true;
    }

    // ============================================
    // TIER 3: Summary + templateContext for older calls
    // ============================================
    else if (recentSummary && callAge >= ONE_DAY) {
      console.log("📊 Tier 3: Injecting summary and templateContext");

      // Build templateContext with structured data
      const summaryData = recentSummary.summary_data;
      ultravoxRequestBody.templateContext = {
        customerName: summaryData.userName || user.name || "there",
        previousDestination: summaryData.cities?.[0]?.city || "",
        bookingProgress: summaryData.bookingProgress || "in progress",
        ...(summaryData.userPreferences || {}),
      };

      // Add synthetic context message
      ultravoxRequestBody.initialMessages = [
        {
          role: "MESSAGE_ROLE_USER",
          text: createContextMessage(recentSummary, user.name),
        },
      ];

      hasInjectedContext = true;
    }

    // ============================================
    // TIER 4: New user (no history)
    // ============================================
    if (!lastCall) {
      console.log("🆕 Tier 4: New user - no history injection");

      ultravoxRequestBody.templateContext = {
        customerName: user.name || "there",
      };
    }

    // ============================================
    // STEP 5: Create Ultravox call via Agent API
    // ============================================
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
        {
          ok: false,
          error: "Failed to create call",
          errorCode: "ULTRAVOX_API_ERROR",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const callData = await response.json();

    // ============================================
    // STEP 6: Store call record
    // ============================================
    await createCallRecord({
      call_id: callData.callId,
      user_id: user.user_id,
      phone_number: phoneNumber,
      source: "ultravox",
      status: "active",
      started_at: new Date().toISOString(),
      metadata: {
        joinUrl: callData.joinUrl,
        contextType: hasInjectedContext ? (callAge < ONE_DAY ? "full_history" : "summary") : "none",
      },
    });

    await updateUserLastCall(user.user_id);

    console.log(`✅ Call created: ${callData.callId} (context: ${hasInjectedContext ? "injected" : "none"})`);

    // ============================================
    // STEP 7: Return response to frontend
    // ============================================
    return NextResponse.json({
      ok: true,
      callId: callData.callId,
      joinUrl: callData.joinUrl,
      hasHistory: hasInjectedContext,
      contextType: hasInjectedContext ? (callAge < ONE_DAY ? "full_history" : "summary") : "none",
      userName: user.name,
    });

  } catch (error) {
    console.error("❌ Call creation error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET endpoint: Check call history for a phone number
// ============================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneNumber = searchParams.get("phone");

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    const user = await getUserByPhone(phoneNumber);

    if (!user) {
      return NextResponse.json({
        hasHistory: false,
        message: "No history found for this number",
      });
    }

    const lastCall = await getLastCallForUser(user.user_id);

    return NextResponse.json({
      hasHistory: !!lastCall,
      user: {
        name: user.name,
        lastCallAt: user.last_call_at,
      },
      lastCall: lastCall ? {
        callId: lastCall.call_id,
        startedAt: lastCall.started_at,
        outcome: lastCall.outcome,
      } : null,
    });

  } catch (error) {
    console.error("Error checking history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
