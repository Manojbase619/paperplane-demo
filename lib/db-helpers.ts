/**
 * Database Helper Functions for Ultravox Memory Support
 *
 * These functions encapsulate common database operations for user tracking,
 * conversation history retrieval, and context injection.
 */

import { getSupabase } from "./database";

// ============================================
// TYPES
// ============================================

export interface User {
  user_id: string;
  phone_number: string;
  name?: string;
  email?: string;
  preferences?: Record<string, any>;
  created_at: string;
  last_call_at?: string;
  updated_at: string;
}

export interface CallMessage {
  role: "user" | "agent" | "system";
  text: string;
  medium?: string;
  ordinal: number;
  timestamp?: string;
}

export interface CallWithMessages {
  call_id: string;
  started_at: string;
  status: string;
  outcome?: string;
  messages?: CallMessage[];
}

export interface CallSummary {
  summary_type: "booking_progress" | "user_preferences" | "conversation_summary";
  summary_data: Record<string, any>;
}

export interface ConversationContext {
  user: User | null;
  lastCall: CallWithMessages | null;
  recentSummaries: CallSummary[];
  callAge: number; // milliseconds since last call
}

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Find user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user by phone:", error);
    return null;
  }

  return data;
}

/**
 * Create new user
 */
export async function createUser(phoneNumber: string, metadata?: Partial<User>): Promise<User | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("users")
    .insert({
      phone_number: phoneNumber,
      ...metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    return null;
  }

  return data;
}

/**
 * Find or create user by phone number
 */
export async function findOrCreateUser(
  phoneNumber: string,
  metadata?: Partial<User>
): Promise<User | null> {
  // Try to find existing user
  let user = await getUserByPhone(phoneNumber);

  // If not found, create new user
  if (!user) {
    user = await createUser(phoneNumber, metadata);
  }

  return user;
}

/**
 * Update user's last call timestamp
 */
export async function updateUserLastCall(userId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("users")
    .update({ last_call_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user last call:", error);
  }
}

/**
 * Update user profile (name, preferences, etc)
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "email" | "preferences">>
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user profile:", error);
  }
}

// ============================================
// CALL OPERATIONS
// ============================================

/**
 * Get last completed call for user
 */
export async function getLastCallForUser(userId: string): Promise<CallWithMessages | null> {
  const supabase = getSupabase();

  const { data: call, error } = await supabase
    .from("calls")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ended")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !call) {
    return null;
  }

  // Fetch messages for this call
  const messages = await getCallMessages(call.call_id);

  return {
    call_id: call.call_id,
    started_at: call.started_at,
    status: call.status,
    outcome: call.outcome,
    messages,
  };
}

/**
 * Get recent calls for user (last N calls)
 */
export async function getRecentCallsForUser(
  userId: string,
  limit: number = 5
): Promise<CallWithMessages[]> {
  const supabase = getSupabase();

  const { data: calls, error } = await supabase
    .from("calls")
    .select("call_id, started_at, status, outcome")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !calls) {
    return [];
  }

  // Fetch messages for each call
  const callsWithMessages = await Promise.all(
    calls.map(async (call) => ({
      ...call,
      messages: await getCallMessages(call.call_id),
    }))
  );

  return callsWithMessages;
}

/**
 * Create call record
 */
export async function createCallRecord(callData: {
  call_id: string;
  user_id: string;
  phone_number: string;
  source: string;
  status: string;
  started_at: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from("calls").insert(callData);

  if (error) {
    console.error("Error creating call record:", error);
    throw error;
  }
}

/**
 * Update call status when ended
 */
export async function updateCallEnded(
  callId: string,
  endedAt: string,
  outcome?: string
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("calls")
    .update({
      status: "ended",
      ended_at: endedAt,
      outcome: outcome || "unknown",
    })
    .eq("call_id", callId);

  if (error) {
    console.error("Error updating call ended:", error);
  }
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Get all messages for a call
 */
export async function getCallMessages(callId: string): Promise<CallMessage[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("call_messages")
    .select("role, text, medium, ordinal, timestamp")
    .eq("call_id", callId)
    .order("ordinal");

  if (error) {
    console.error("Error fetching call messages:", error);
    return [];
  }

  return data || [];
}

/**
 * Store messages from Ultravox transcript
 */
export async function storeCallMessages(
  callId: string,
  messages: Array<{ role: string; text: string; medium?: string }>
): Promise<void> {
  const supabase = getSupabase();

  // Filter to only user and agent messages
  const messagesToInsert = messages
    .filter((msg) => msg.role === "MESSAGE_ROLE_USER" || msg.role === "MESSAGE_ROLE_AGENT")
    .map((msg, idx) => ({
      call_id: callId,
      role: msg.role.replace("MESSAGE_ROLE_", "").toLowerCase(),
      text: msg.text || "",
      medium: (msg.medium || "voice").toLowerCase().replace("message_medium_", ""),
      ordinal: idx,
      timestamp: new Date().toISOString(),
    }));

  if (messagesToInsert.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("call_messages")
    .insert(messagesToInsert);

  if (error) {
    console.error("Error storing call messages:", error);
    throw error;
  }
}

// ============================================
// SUMMARY OPERATIONS
// ============================================

/**
 * Get summaries for a user's recent calls
 */
export async function getUserSummaries(
  userId: string,
  limit: number = 3
): Promise<CallSummary[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("call_summaries")
    .select("summary_type, summary_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching user summaries:", error);
    return [];
  }

  return data || [];
}

/**
 * Get summary for a specific call
 */
export async function getCallSummary(callId: string): Promise<CallSummary | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("call_summaries")
    .select("summary_type, summary_data")
    .eq("call_id", callId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Store call summary
 */
export async function storeCallSummary(
  callId: string,
  userId: string,
  summaryType: CallSummary["summary_type"],
  summaryData: Record<string, any>
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("call_summaries")
    .insert({
      call_id: callId,
      user_id: userId,
      summary_type: summaryType,
      summary_data: summaryData,
    });

  if (error) {
    console.error("Error storing call summary:", error);
    throw error;
  }
}

// ============================================
// CONTEXT RETRIEVAL (Main Helper)
// ============================================

/**
 * Get full conversation context for a user
 * Returns user profile, last call with messages, and recent summaries
 */
export async function getConversationContext(
  phoneNumber: string
): Promise<ConversationContext> {
  const user = await getUserByPhone(phoneNumber);

  if (!user) {
    return {
      user: null,
      lastCall: null,
      recentSummaries: [],
      callAge: Infinity,
    };
  }

  const lastCall = await getLastCallForUser(user.user_id);
  const recentSummaries = await getUserSummaries(user.user_id, 3);

  const callAge = lastCall
    ? Date.now() - new Date(lastCall.started_at).getTime()
    : Infinity;

  return {
    user,
    lastCall,
    recentSummaries,
    callAge,
  };
}

// ============================================
// ULTRAVOX MESSAGE FORMATTING
// ============================================

/**
 * Format messages for Ultravox initialMessages
 */
export function formatMessagesForUltravox(messages: CallMessage[]) {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "MESSAGE_ROLE_USER" : "MESSAGE_ROLE_AGENT",
    text: msg.text,
  }));
}

/**
 * Create synthetic context message from summary
 */
export function createContextMessage(summary: CallSummary, userName?: string): string {
  const { summary_type, summary_data } = summary;

  if (summary_type === "booking_progress") {
    return `[Previous conversation context - do not mention this to the user explicitly]

User: ${userName || "This user"}
Booking Progress: ${JSON.stringify(summary_data, null, 2)}

Key details to remember:
- Destinations discussed: ${(summary_data.cities || []).map((c: any) => c.city || c).join(", ")}
- Status: ${summary_data.bookingProgress || "in progress"}
- Use this context naturally when the user references previous discussions.
`;
  }

  if (summary_type === "user_preferences") {
    return `[User preferences - do not mention this to the user explicitly]

${userName ? `User name: ${userName}` : ""}
Preferences: ${JSON.stringify(summary_data, null, 2)}

Keep these in mind for recommendations.
`;
  }

  return `[Previous context: ${JSON.stringify(summary_data)}]`;
}

// ============================================
// TIME CONSTANTS
// ============================================

export const ONE_HOUR = 60 * 60 * 1000;
export const ONE_DAY = 24 * ONE_HOUR;
export const SEVEN_DAYS = 7 * ONE_DAY;
export const THIRTY_DAYS = 30 * ONE_DAY;
