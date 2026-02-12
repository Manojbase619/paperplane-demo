/**
 * Database Helper Functions for Ultravox Memory Support
 */

import { getSupabase } from "./database";

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  preferences?: Record<string, any>;
  created_at: string;
  last_call_at?: string;
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

export interface ConversationContext {
  user: User | null;
  lastCall: CallWithMessages | null;
  recentSummaries: CallSummary[];
  callAge: number;
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

  if (error || !data) return null;
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

  if (error || !data) return null;
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

  await supabase
    .from("users")
    .update({ last_call_at: new Date().toISOString() })
    .eq("id", userId);
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "email" | "preferences">>
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from("users").update(updates).eq("id", userId);
}

// ============================================
// CALL OPERATIONS
// ============================================

export async function getLastCallForUser(
  userId: string
): Promise<CallWithMessages | null> {
  const supabase = getSupabase();

  const { data: call } = await supabase
    .from("calls")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ended")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!call) return null;

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
  await supabase.from("calls").insert(callData);
}

export async function updateCallEnded(
  callId: string,
  endedAt: string,
  outcome?: string
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("calls")
    .update({
      status: "ended",
      ended_at: endedAt,
      outcome: outcome || "unknown",
    })
    .eq("call_id", callId);
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function getCallMessages(
  callId: string
): Promise<CallMessage[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("call_messages")
    .select("role, text, medium, ordinal, timestamp")
    .eq("call_id", callId)
    .order("ordinal");

  return data || [];
}

/**
 * 🔥 THIS WAS MISSING — required by webhook
 */
export async function storeCallMessages(
  callId: string,
  messages: Array<{ role: string; text: string; medium?: string }>
) {
  const supabase = getSupabase();

  const rows = messages
    .filter(
      (m) =>
        m.role === "MESSAGE_ROLE_USER" ||
        m.role === "MESSAGE_ROLE_AGENT"
    )
    .map((m, index) => ({
      call_id: callId,
      role: m.role.replace("MESSAGE_ROLE_", "").toLowerCase(),
      text: m.text || "",
      medium: (m.medium || "voice")
        .toLowerCase()
        .replace("message_medium_", ""),
      ordinal: index,
      timestamp: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  await supabase.from("call_messages").insert(rows);
}

// ============================================
// SUMMARY OPERATIONS
// ============================================

export async function getUserSummaries(
  userId: string,
  limit: number = 3
): Promise<CallSummary[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("call_summaries")
    .select("summary_type, summary_data")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getCallSummary(
  callId: string
): Promise<CallSummary | null> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("call_summaries")
    .select("summary_type, summary_data")
    .eq("call_id", callId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

/** Admin: recent calls with messages for Command Center */
export async function getRecentCallsAdmin(
  limit: number = 50
): Promise<
  Array<{
    call_id: string;
    phone_number: string | null;
    user_id: string | null;
    status: string;
    started_at: string | null;
    ended_at: string | null;
    outcome: string | null;
    duration_seconds: number | null;
    messages: CallMessage[];
  }>
> {
  const supabase = getSupabase();

  const { data: calls, error: callsError } = await supabase
    .from("calls")
    .select("call_id, phone_number, user_id, status, started_at, ended_at, outcome")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (callsError || !calls?.length) {
    return [];
  }

  const callIds = calls.map((c) => c.call_id);
  const { data: messageRows } = await supabase
    .from("call_messages")
    .select("call_id, role, text, medium, ordinal, timestamp")
    .in("call_id", callIds)
    .order("ordinal");

  const messagesByCall = (messageRows ?? []).reduce(
    (acc: Record<string, CallMessage[]>, row: any) => {
      const cid = row.call_id;
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push({
        role: row.role,
        text: row.text ?? "",
        medium: row.medium,
        ordinal: row.ordinal ?? 0,
        timestamp: row.timestamp,
      });
      return acc;
    },
    {}
  );

  return calls.map((c) => {
    const started = c.started_at ? new Date(c.started_at).getTime() : null;
    const ended = c.ended_at ? new Date(c.ended_at).getTime() : null;
    const duration_seconds =
      started != null && ended != null
        ? Math.max(0, Math.round((ended - started) / 1000))
        : null;
    return {
      call_id: c.call_id,
      phone_number: c.phone_number ?? null,
      user_id: c.user_id ?? null,
      status: c.status,
      started_at: c.started_at ?? null,
      ended_at: c.ended_at ?? null,
      outcome: c.outcome ?? null,
      duration_seconds,
      messages: messagesByCall[c.call_id] ?? [],
    };
  });
}

/** Get call record by call_id (for webhook to read metadata e.g. agentPrompt) */
export async function getCallByCallId(callId: string): Promise<{
  metadata?: Record<string, any>;
  user_id?: string;
  phone_number?: string;
} | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("calls")
    .select("metadata, user_id, phone_number")
    .eq("call_id", callId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ============================================
// RUNTIME CALL SESSIONS + AGENTS (agent-builder / voice runtime)
// ============================================

export interface RuntimeCallSession {
  id: string;
  call_id: string;
  agent_id: string;
  user_id: string | null;
  state_json: Record<string, unknown>;
  created_at: string;
}

export async function getRuntimeCallSessionByCallId(
  callId: string
): Promise<RuntimeCallSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runtime_call_sessions")
    .select("id, call_id, agent_id, user_id, state_json, created_at")
    .eq("call_id", callId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    call_id: data.call_id,
    agent_id: data.agent_id,
    user_id: data.user_id ?? null,
    state_json: (data.state_json as Record<string, unknown>) ?? {},
    created_at: data.created_at,
  };
}

export async function createRuntimeCallSession(params: {
  call_id: string;
  agent_id: string;
  user_id: string | null;
  state_json?: Record<string, unknown>;
}): Promise<RuntimeCallSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runtime_call_sessions")
    .insert({
      call_id: params.call_id,
      agent_id: params.agent_id,
      user_id: params.user_id ?? null,
      state_json: params.state_json ?? {},
    })
    .select("id, call_id, agent_id, user_id, state_json, created_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    call_id: data.call_id,
    agent_id: data.agent_id,
    user_id: data.user_id ?? null,
    state_json: (data.state_json as Record<string, unknown>) ?? {},
    created_at: data.created_at,
  };
}

export interface AgentRecord {
  id: string;
  name: string;
  description: string | null;
  spec_json: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

export async function getAgentById(
  agentId: string
): Promise<AgentRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, description, spec_json, version, created_at, updated_at")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    spec_json: (data.spec_json as Record<string, unknown>) ?? {},
    version: data.version ?? 1,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/** Latest conversation summary for a user (for memory injection). */
export async function getLatestConversationSummaryForUser(
  userId: string
): Promise<{ summary_data: Record<string, unknown> } | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("call_summaries")
    .select("summary_data")
    .eq("user_id", userId)
    .eq("summary_type", "conversation_summary")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ============================================
// AGENT BUILDER SESSIONS
// ============================================

export interface AgentBuilderSessionRecord {
  id: string;
  user_id: string | null;
  current_step: string;
  collected_data: Record<string, unknown>;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
}

export async function getAgentBuilderSessionById(
  sessionId: string
): Promise<AgentBuilderSessionRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agent_builder_sessions")
    .select("id, user_id, current_step, collected_data, status, created_at, updated_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    user_id: data.user_id ?? null,
    current_step: data.current_step,
    collected_data: (data.collected_data as Record<string, unknown>) ?? {},
    status: data.status as "active" | "completed",
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getActiveAgentBuilderSessionByUserId(
  userId: string
): Promise<AgentBuilderSessionRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agent_builder_sessions")
    .select("id, user_id, current_step, collected_data, status, created_at, updated_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    user_id: data.user_id ?? null,
    current_step: data.current_step,
    collected_data: (data.collected_data as Record<string, unknown>) ?? {},
    status: data.status as "active" | "completed",
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function upsertAgentBuilderSession(params: {
  id?: string;
  user_id?: string | null;
  current_step: string;
  collected_data: Record<string, unknown>;
  status: "active" | "completed";
}): Promise<AgentBuilderSessionRecord> {
  const supabase = getSupabase();
  const row = {
    user_id: params.user_id ?? null,
    current_step: params.current_step,
    collected_data: params.collected_data,
    status: params.status,
  };
  if (params.id) {
    const { data, error } = await supabase
      .from("agent_builder_sessions")
      .update(row)
      .eq("id", params.id)
      .select("id, user_id, current_step, collected_data, status, created_at, updated_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id ?? null,
      current_step: data.current_step,
      collected_data: (data.collected_data as Record<string, unknown>) ?? {},
      status: data.status as "active" | "completed",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } else {
    const { data, error } = await supabase
      .from("agent_builder_sessions")
      .insert(row)
      .select("id, user_id, current_step, collected_data, status, created_at, updated_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id ?? null,
      current_step: data.current_step,
      collected_data: (data.collected_data as Record<string, unknown>) ?? {},
      status: data.status as "active" | "completed",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}

export async function createAgent(params: {
  name: string;
  description?: string | null;
  spec_json: Record<string, unknown>;
  version?: number;
}): Promise<AgentRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      name: params.name,
      description: params.description ?? null,
      spec_json: params.spec_json,
      version: params.version ?? 1,
    })
    .select("id, name, description, spec_json, version, created_at, updated_at")
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    spec_json: (data.spec_json as Record<string, unknown>) ?? {},
    version: data.version ?? 1,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

// ============================================
// CONTEXT HELPERS
// ============================================

export function formatMessagesForUltravox(messages: CallMessage[]) {
  return messages.map((msg) => ({
    role:
      msg.role === "user"
        ? "MESSAGE_ROLE_USER"
        : "MESSAGE_ROLE_AGENT",
    text: msg.text,
  }));
}

export function createContextMessage(
  summary: CallSummary,
  userName?: string
): string {
  return `[Internal context for agent]

User: ${userName || "User"}
${JSON.stringify(summary.summary_data, null, 2)}
`;
}

// ============================================
// TIME CONSTANTS
// ============================================

export const ONE_HOUR = 60 * 60 * 1000;
export const ONE_DAY = 24 * ONE_HOUR;
export const SEVEN_DAYS = 7 * ONE_DAY;
export const THIRTY_DAYS = 30 * ONE_DAY;
