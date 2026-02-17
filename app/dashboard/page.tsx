"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UltravoxSession,
  UltravoxSessionStatus,
} from "ultravox-client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { VoiceReactiveVisual } from "@/components/VoiceReactiveVisual";
import { getCurrentUser, getDisplayName } from "@/lib/storage";
import { cn } from "@/lib/utils";

type CallState = "idle" | "connecting" | "active" | "ended";

type TranscriptLine = {
  id: number;
  text: string;
  ts: number;
};

type TranscriptLike =
  | { text?: unknown; speaker?: unknown; role?: unknown; timestamp?: unknown }
  | { detail?: any; data?: any }
  | any;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [lastCall, setLastCall] = useState<{
    callId: string;
    startedAt: string;
    outcome?: string;
  } | null>(null);

  const lineIndexRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<UltravoxSession | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u || (!u.phone && !u.email)) {
      router.replace("/");
      return;
    }
    setUser(u);
    setPhone(u.phone || null);
  }, [router]);

  useEffect(() => {
    if (!phone) return;
    let cancelled = false;
    async function fetchLastCall() {
      try {
        const res = await fetch(
          `/api/calls/create?phone=${encodeURIComponent(phone!)}`,
          { cache: "no-store" }
        );
        const json = await res.json().catch(() => null);
        if (!cancelled && json?.lastCall)
          setLastCall({
            callId: json.lastCall.callId,
            startedAt: json.lastCall.startedAt,
            outcome: json.lastCall.outcome,
          });
        else if (!cancelled) setLastCall(null);
      } catch {
        if (!cancelled) setLastCall(null);
      }
    }
    fetchLastCall();
    return () => {
      cancelled = true;
    };
  }, [phone, callState]);

  useEffect(() => {
    if (callState !== "active") return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcript.length]);

  const displayName = getDisplayName(user);
  const formattedPhone = useMemo(() => {
    if (!phone) return "";
    return phone.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d+)/, "$1 $2 $3");
  }, [phone]);

  const canStartCall = Boolean(phone);

  function addTranscriptLine(speakerLabel: "You" | "Agent" | "Unknown", text: string, ts?: number) {
    const clean = String(text ?? "").trim();
    if (!clean) return;
    setTranscript((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        text: `${speakerLabel}: ${clean}`,
        ts: typeof ts === "number" ? ts : Date.now(),
      },
    ]);
  }

  function handleUltravoxTranscriptEvent(event: TranscriptLike) {
    // Try a few shapes: direct event, event.detail, event.data, or nested payloads.
    const payload =
      event?.detail ??
      event?.data ??
      event;

    // Some SDKs wrap datamessages as { type: "transcript", ... }.
    const type = String(payload?.type ?? payload?.messageType ?? "").toLowerCase();

    // If it's not explicitly a transcript, still attempt extraction when "text" is present.
    const text = payload?.text ?? payload?.transcript?.text ?? payload?.content ?? payload?.message?.text;
    if (!text) return;

    const speakerRaw = payload?.speaker ?? payload?.role ?? payload?.transcript?.speaker ?? payload?.message?.role;
    const speaker = String(speakerRaw ?? "").toLowerCase();
    const speakerLabel =
      speaker === "user" || speaker === "caller" || speaker === "customer"
        ? "You"
        : speaker === "agent" || speaker === "assistant"
          ? "Agent"
          : type === "transcript"
            ? "Unknown"
            : "Unknown";

    const tsRaw = payload?.timestamp ?? payload?.ts ?? payload?.time;
    const ts = typeof tsRaw === "number" ? tsRaw : Date.now();

    addTranscriptLine(speakerLabel, String(text), ts);
  }

  async function requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError(
        "Your browser doesn't support microphone access. Please use Chrome, Firefox, Safari, or Edge."
      );
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionError(null);
      return true;
    } catch (err: any) {
      console.error("Microphone permission error:", err);
      let errorMsg = "";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg =
          "Microphone access denied. Click the lock icon in your browser's address bar and allow microphone access, then try again.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg =
          "No microphone found. Please connect a microphone device and try again.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMsg =
          "Microphone is being used by another application. Please close other apps using your microphone and try again.";
      } else if (err.name === "OverconstrainedError") {
        errorMsg =
          "Microphone settings are not supported. Please try a different microphone or browser.";
      } else {
        errorMsg = `Microphone error: ${err.message || err.name || "Unknown error"}. Please check your browser settings.`;
      }
      
      setPermissionError(errorMsg);
      return false;
    }
  }

  async function startCall() {
    if (!phone) return;
    setPermissionError(null);
    setCallState("connecting");
    setDuration(0);
    setTranscript([]);
    lineIndexRef.current = 0;

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setCallState("idle");
      return;
    }
    try {
      const pendingPrompt =
        typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem("basethesis_voice_pending_prompt")
          : null;
      const body: { phoneNumber: string; prompt?: string } = {
        phoneNumber: phone || "", // empty for email-only users; API may require a number for actual calls
      };
      if (pendingPrompt?.trim()) {
        body.prompt = pendingPrompt.trim();
        sessionStorage.removeItem("basethesis_voice_pending_prompt");
      }

      const res = await fetch("/api/calls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);
      if (!json?.ok || !json?.joinUrl) {
        console.warn("Call create failed, response:", res.status, json);
        setPermissionError(json?.error ?? "Failed to start call. Please check your configuration.");
        setCallState("idle");
        return;
      }

      const uvSession = new UltravoxSession();
      sessionRef.current = uvSession;

      try {
        await uvSession.joinCall(json.joinUrl);
        setCallState("active");
        setPermissionError(null);
      } catch (joinErr: any) {
        console.error("Join call error:", joinErr);
        let errorMsg = "";
        
        if (
          joinErr.name === "NotAllowedError" ||
          joinErr.name === "PermissionDeniedError" ||
          joinErr.message?.toLowerCase().includes("permission") ||
          joinErr.message?.toLowerCase().includes("denied")
        ) {
          errorMsg =
            "Microphone permission denied. Please click the lock icon in your browser's address bar, allow microphone access, refresh the page, and try again.";
        } else if (joinErr.message) {
          errorMsg = `Failed to join call: ${joinErr.message}`;
        } else {
          errorMsg = "Failed to join call. Please check your microphone permissions and try again.";
        }
        
        setPermissionError(errorMsg);
        setCallState("idle");
        
        if (sessionRef.current) {
          try {
            await sessionRef.current.leaveCall();
          } catch {
            // ignore cleanup errors
          }
          sessionRef.current = null;
        }
        return;
      }

      uvSession.addEventListener("status", () => {
        console.log("Ultravox status:", uvSession.status);
        const status = uvSession.status;
        if (
          status === UltravoxSessionStatus.LISTENING ||
          status === UltravoxSessionStatus.SPEAKING ||
          status === UltravoxSessionStatus.THINKING
        ) {
          setCallState("active");
        } else if (
          status === UltravoxSessionStatus.DISCONNECTING ||
          status === UltravoxSessionStatus.IDLE
        ) {
          setCallState("ended");
        }
      });

      // Different ultravox-client versions have used different event names/shapes.
      // Register a few likely ones and normalize.
      (["transcript", "message", "dataMessage"] as const).forEach((evtName) => {
        try {
          uvSession.addEventListener(evtName as any, (event: any) => {
            console.log(`Ultravox ${evtName} event:`, event);
            handleUltravoxTranscriptEvent(event);
          });
        } catch {
          // ignore unsupported event names
        }
      });
    } catch (err: any) {
      console.error("Ultravox start error:", err);
      let errorMsg = "Failed to start call. ";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg +=
          "Microphone permission denied. Please allow microphone access in your browser settings.";
      } else if (err.message) {
        errorMsg += err.message;
      } else {
        errorMsg += "Please check your connection and try again.";
      }
      
      setPermissionError(errorMsg);
      setCallState("idle");
    }
  }

  async function endCall() {
    if (sessionRef.current) {
      try {
        await sessionRef.current.leaveCall();
      } catch (err) {
        console.error("Error leaving call:", err);
      }
      sessionRef.current = null;
    }
    setCallState("ended");
  }

  function resetCall() {
    if (sessionRef.current) {
      try {
        sessionRef.current.leaveCall();
      } catch (err) {
        console.error("Error leaving call:", err);
      }
      sessionRef.current = null;
    }
    setCallState("idle");
    setDuration(0);
    setTranscript([]);
    lineIndexRef.current = 0;
  }

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try {
          sessionRef.current.leaveCall();
        } catch (err) {
          console.error("Error cleaning up session:", err);
        }
      }
    };
  }, []);

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[color:var(--bg0)] text-[color:var(--text-soft)]">
      <video
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-35"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/control-room-pan.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(108,62,232,0.08),transparent 55%),radial-gradient(circle_at_100%_0%,rgba(108,62,232,0.06),transparent 60%),linear-gradient(180deg,var(--bg0),var(--surface-1))]" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-3 py-6 sm:px-4 sm:py-8 md:px-8 md:py-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)] sm:text-xs">
              Basethesis
            </div>
            <h1 className="mt-0.5 truncate text-xl text-[color:var(--text-soft)] sm:mt-1 sm:text-2xl md:text-3xl">
              Voice Operations Deck
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle size="sm" />
            {displayName && (user?.firstName?.trim() || user?.lastName?.trim()) && (
              <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-1.5 text-xs text-[color:var(--text-muted)]">
                <span className="text-[color:var(--text-soft)]">{displayName}</span>
              </div>
            )}
            {phone && (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/console")}
                  className="hidden items-center gap-2 rounded-full bg-[color:var(--accent)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white hover:opacity-90 md:flex"
                >
                  <span>Console</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="hidden items-center gap-2 rounded-full border border-[color:var(--accent)] bg-[color:var(--surface-2)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--accent)] hover:bg-[color:var(--accent)]/10 md:flex"
                >
                  <span>Command Center</span>
                </button>
              </>
            )}
          </div>
        </header>

        <main className="cinematic-section flex flex-1 flex-col">
          <section className="flex flex-1 flex-col items-center justify-center">
            <div className="surface-card flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 md:gap-6 md:px-8 md:py-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.32em] text-[color:var(--text-muted)]">
                    Call channel
                  </div>
                  <div className="mt-1 text-sm text-[color:var(--text-soft)]">
                    {callState === "active"
                      ? "Live call in progress"
                      : callState === "connecting"
                        ? "Establishing link"
                        : callState === "ended"
                          ? "Last call completed"
                          : "Standing by"}
                  </div>
                </div>
                <div className="text-right text-xs text-[color:var(--text-muted)]">
                  <div className="font-mono text-sm text-[color:var(--text-soft)]">
                    {formatDuration(duration)}
                  </div>
                  <div>{callState === "active" ? "Duration" : "Ready"}</div>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center py-4">
                <VoiceReactiveVisual active={callState === "active"} />
              </div>

              <p className="text-center text-xs text-[color:var(--text-muted)]">
                {callState === "active"
                  ? "Connected — voice level"
                  : "Start a call to see live voice level"}
              </p>

              {phone && (
                <div className="w-full text-center">
                  <span className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                    Basethesis{" "}
                  </span>
                  {lastCall ? (
                    <span className="text-xs text-[color:var(--text-soft)]">
                      Last call{" "}
                      {new Date(lastCall.startedAt).toLocaleDateString()}{" "}
                      {lastCall.outcome && `(${lastCall.outcome})`}
                    </span>
                  ) : (
                    <span className="text-xs text-[color:var(--text-muted)]">No calls yet</span>
                  )}
                </div>
              )}

              {(callState === "active" || callState === "ended") && transcript.length > 0 && (
                <div className="w-full">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
                      Live transcript
                    </span>
                    <span className="text-[10px] text-[color:var(--text-muted)]">
                      {transcript.length} line{transcript.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div
                    ref={scrollRef}
                    className="max-h-40 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-0)]/80 p-3 text-left"
                  >
                    <div className="space-y-2">
                      {transcript.map((line) => (
                        <div
                          key={line.id}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm",
                            line.text.startsWith("You:")
                              ? "ml-2 bg-[color:var(--accent)]/10 text-[color:var(--text-soft)]"
                              : "mr-2 bg-[color:var(--surface-2)]/80 text-[color:var(--text-soft)]"
                          )}
                        >
                          {line.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {permissionError && (
                <div className="rounded-lg border border-red-500/50 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                  <div className="font-medium">Permission Required</div>
                  <div className="mt-1 text-xs text-red-300/80">
                    {permissionError}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPermissionError(null)}
                    className="mt-2 text-xs underline hover:text-red-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">
                {callState === "idle" && (
                  <button
                    type="button"
                    onClick={startCall}
                    className={cn(
                      "btn-primary flex-1 md:flex-none",
                      !canStartCall && "opacity-60"
                    )}
                    disabled={!canStartCall}
                  >
                    Start call
                  </button>
                )}
                {callState === "connecting" && (
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-0)] px-6 py-3 text-sm font-medium tracking-wide text-[color:var(--text-soft)] md:flex-none"
                    disabled
                  >
                    Linking…
                  </button>
                )}
                {callState === "active" && (
                  <button
                    type="button"
                    onClick={endCall}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-red-500/50 bg-red-600/25 px-6 py-3 text-sm font-medium tracking-wide text-red-100 transition-[background,transform,border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.19,1,0.22,1)] md:flex-none"
                  >
                    End call
                  </button>
                )}
                {callState === "ended" && (
                  <button
                    type="button"
                    onClick={resetCall}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-6 py-3 text-sm font-medium tracking-wide text-[color:var(--text-soft)] transition-[background,transform,border-color] duration-[260ms] ease-[cubic-bezier(0.19,1,0.22,1)] hover:bg-[color:var(--surface-0)] md:flex-none"
                  >
                    Start another call
                  </button>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

