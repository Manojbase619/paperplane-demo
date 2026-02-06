/**
 * Agent library for Ultravox integration
 *
 * Handles agent lifecycle: start calls, stop calls
 */

export type AgentStatus = "idle" | "listening" | "speaking";

/**
 * Start a new call with memory support
 *
 * @param phoneNumber - User's phone number (E.164 format: +911234567890)
 * @returns Call data with join URL
 */
export async function startAgent(phoneNumber: string) {
  const res = await fetch("/api/calls/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneNumber }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || error.message || "Failed to start call");
  }

  return await res.json();
}

/**
 * Stop the current call
 * (Client-side only - actual call ending happens via Ultravox SDK)
 */
export async function stopAgent(): Promise<{ ok: boolean }> {
  // TODO: Implement actual stop logic via Ultravox client
  // For now, this is a no-op since the call ends when user closes connection
  return { ok: true };
}

/**
 * Check if a phone number has previous call history
 */
export async function checkCallHistory(phoneNumber: string) {
  const res = await fetch(`/api/calls/create?phone=${encodeURIComponent(phoneNumber)}`);

  if (!res.ok) {
    return { hasHistory: false };
  }

  return await res.json();
}
