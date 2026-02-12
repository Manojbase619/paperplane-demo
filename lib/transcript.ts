export type Speaker = "agent" | "user";

export type TranscriptLine = {
  id: string;
  speaker: Speaker;
  text: string;
  ts: number; // epoch ms
};

function randomId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function makeLine(
  speaker: Speaker,
  text: string,
  ts: number = Date.now()
): TranscriptLine {
  return { id: randomId(), speaker, text, ts };
}

export function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export async function fetchTranscript(): Promise<TranscriptLine[]> {
  const res = await fetch("/api/transcript", { cache: "no-store" });
  if (!res.ok) throw new Error(`Transcript fetch failed (${res.status})`);
  const data = await res.json();

  // Accept flexible backend shapes; normalize into TranscriptLine[].
  const raw =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.messages) && data.messages) ||
    (Array.isArray(data?.transcript) && data.transcript) ||
    [];

  const normalized: TranscriptLine[] = raw
    .map((m: any) => {
      const speaker: Speaker =
        m?.speaker === "agent" || m?.speaker === "user"
          ? m.speaker
          : m?.role === "assistant"
            ? "agent"
            : "user";
      const text = String(m?.text ?? m?.content ?? "").trim();
      const ts =
        typeof m?.ts === "number"
          ? m.ts
          : typeof m?.timestamp === "number"
            ? m.timestamp
            : Date.now();
      if (!text) return null;
      return { id: String(m?.id ?? randomId()), speaker, text, ts } satisfies TranscriptLine;
    })
    .filter(Boolean) as TranscriptLine[];

  return normalized;
}

export function buildMockTranscript(seed: number = Date.now()) {
  // Deterministic-ish sequence so it feels cohesive.
  const base = seed % 1000;
  const script: Array<{ speaker: Speaker; text: string }> = [
    { speaker: "agent", text: "Basethesis online. I’m listening." },
    { speaker: "user", text: "Hey—can you help me book a quick meeting for tomorrow?" },
    { speaker: "agent", text: "Absolutely. What time window works best, and which timezone?" },
    { speaker: "user", text: "Anytime between 2 and 5 PM, IST." },
    { speaker: "agent", text: "Great. Who should be invited, and what’s the meeting about?" },
    { speaker: "user", text: "Invite Priya and Arjun. Topic: product demo follow-up." },
    { speaker: "agent", text: "Done. I’ll propose 3:00 PM IST and include an agenda." },
    { speaker: "agent", text: "Would you like a short summary message to send in the invite?" },
  ];

  return script.map((s, i) => makeLine(s.speaker, s.text, Date.now() - (script.length - i) * (1200 + base)));
}

