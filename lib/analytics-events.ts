export type AnalyticsEventType =
  | "call_started"
  | "call_ended"
  | "prompt_saved"
  | "test_agent_triggered"
  | "prompt_generated"
  | "agent_created"
  | "agent_updated";

export async function trackAnalyticsEvent(input: {
  eventType: AnalyticsEventType;
  agentId?: string;
  callId?: string;
  phoneNumber?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // best-effort
  }
}
