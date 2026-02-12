/**
 * Database Helper Functions for Ultravox Memory Support
 */

import { getSupabase } from "./database";

// ============================================
// TYPES
// ============================================

export interface User {
  id: string; // ✅ FIXED (was user_id)
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
  summary_type:
    | "booking_progress"
    | "user_preferences"
    | "conversation_summary";
  summary_data: Record<string, any>;
}

// ============================================
// USER OPERATIONS
// ============================================

export async function getUserByPhone(
  phoneNumber: string
): Promise<User | null> {
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

export async function createUser(
  phoneNumber: string,
  metadata?: Partial<User>
): Promise<User | null> {
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

export async function findOrCreateUser(
  phoneNumber: string,
  metadata?: Partial<User>
): Promise<User | null> {
  let user = await getUserByPhone(phoneNumber);
  if (!user) {
    user = await createUser(phoneNumber, metadata);
  }
  return user;
}

export async function updateUserLastCall(userId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("users")
    .update({ last_call_at: new Date().toISOString() })
    .eq("id", userId); // ✅ FIXED

  if (error) {
    console.error("Error updating user last call:", error);
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "email" | "preferences">>
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId); // ✅ FIXED

  if (error) {
    console.error("Error updating user profile:", error);
  }
}

// ============================================
// CALL OPERATIONS
// ============================================

export async function getLastCallForUser(
  userId: string
): Promise<CallWithMessages | null> {
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

  const messages = await getCallMessages(call.call_id);

  return {
    call_id: call.call_id,
    started_at: call.started_at,
    status: call.status,
    outcome: call.outcome,
    messages,
  };
}

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

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function getCallMessages(
  callId: string
): Promise<CallMessage[]> {
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

// ============================================
// SUMMARY OPERATIONS
// ============================================

export async function getCallSummary(
  callId: string
): Promise<CallSummary | null> {
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

// ============================================
// CONTEXT RETRIEVAL
// ============================================

export async function getConversationContext(
  phoneNumber: string
) {
  const user = await getUserByPhone(phoneNumber);

  if (!user) {
    return {
      user: null,
      lastCall: null,
      recentSummaries: [],
      callAge: Infinity,
    };
  }

  const lastCall = await getLastCallForUser(user.id); // ✅ FIXED
  const callAge = lastCall
    ? Date.now() - new Date(lastCall.started_at).getTime()
    : Infinity;

  return {
    user,
    lastCall,
    recentSummaries: [],
    callAge,
  };
}

// ============================================
// TIME CONSTANTS
// ============================================

export const ONE_HOUR = 60 * 60 * 1000;
export const ONE_DAY = 24 * ONE_HOUR;
export const SEVEN_DAYS = 7 * ONE_DAY;
export const THIRTY_DAYS = 30 * ONE_DAY;
