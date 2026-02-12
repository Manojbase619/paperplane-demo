"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";

type AdminCallRow = {
  call_id: string;
  phone_number: string | null;
  status: string;
  started_at: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  messages: { role: string; text: string; ordinal: number; timestamp?: string }[];
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function ConsoleTranscriptionsPage() {
  const [calls, setCalls] = useState<AdminCallRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/calls?limit=30", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled) setCalls((json?.calls ?? []) as AdminCallRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
          Transcriptions
        </div>
        <h1 className="mt-1 text-2xl text-[color:var(--text-soft)] md:text-3xl">
          Transcripts
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Call messages stored in `call_messages` (loaded via `/api/admin/calls`).
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[color:var(--border)] px-5 py-3 text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
          Recent transcripts
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Messages</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => {
                const open = expanded === call.call_id;
                return (
                  <Fragment key={call.call_id}>
                    <tr className="border-b border-[color:var(--border)] hover:bg-[color:var(--surface-0)]">
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : call.call_id)}
                          className="flex h-8 w-8 items-center justify-center rounded text-[color:var(--text-muted)] hover:bg-[color:var(--accent)]/10 hover:text-[color:var(--accent)]"
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[color:var(--text-soft)]">
                        {formatTime(call.started_at)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[color:var(--text-soft)]">
                        {call.phone_number ?? "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[color:var(--text-soft)]">
                        {call.duration_seconds ?? "—"}s
                      </td>
                      <td className="px-4 py-2 text-xs text-[color:var(--text-muted)]">
                        {call.outcome ?? "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[color:var(--text-muted)]">
                        {call.messages?.length ?? 0}
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-0)]">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 font-mono text-xs">
                            {(call.messages ?? [])
                              .slice()
                              .sort((a, b) => a.ordinal - b.ordinal)
                              .map((m, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "flex gap-3 rounded px-2 py-1.5",
                                    m.role === "user"
                                      ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                                      : m.role === "agent"
                                        ? "bg-[color:var(--accent)]/5 text-[color:var(--text-soft)]"
                                        : "bg-[color:var(--surface-0)] text-[color:var(--text-muted)]"
                                  )}
                                >
                                  <span className="w-14 shrink-0 uppercase text-[color:var(--text-muted)]">
                                    {m.role}
                                  </span>
                                  <span className="break-words text-[color:var(--text-soft)]">{m.text}</span>
                                  {m.timestamp && (
                                    <span className="ml-auto shrink-0 text-[color:var(--text-muted)]">
                                      {formatTime(m.timestamp)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            {(call.messages?.length ?? 0) === 0 && (
                              <div className="text-[color:var(--text-muted)]">No messages.</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && calls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[color:var(--text-muted)]">
                    No transcripts yet.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[color:var(--text-muted)]">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

