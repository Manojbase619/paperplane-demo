"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";

export type CallRow = {
  call_id: string;
  phone_number: string | null;
  user_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  messages: Array<{ role: string; text: string; medium?: string; ordinal?: number; timestamp?: string }>;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(sec: number | null) {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

/** Derive country placeholder from phone (e.g. +1 → US). Not accurate for all countries. */
function countryFromPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length >= 11) return "US";
  if (digits.startsWith("44")) return "UK";
  if (digits.startsWith("91")) return "IN";
  return "—";
}

function summaryPreview(messages: CallRow["messages"], maxLen: number = 56): string {
  const text = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => m.text)
    .join(" ");
  if (!text.trim()) return "—";
  return text.length <= maxLen ? text : text.slice(0, maxLen) + "…";
}

function statusBadge(status: string) {
  const s = (status || "").toLowerCase();
  const variant =
    s === "completed" || s === "ended"
      ? "bg-[color:var(--cta-green)]/10 text-[color:var(--cta-green)] border-[color:var(--cta-green)]/30"
      : s === "active" || s === "in-progress"
        ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)] border-[color:var(--accent)]/30"
        : "bg-[color:var(--surface-0)] text-[color:var(--text-muted)] border-[color:var(--border)]";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        variant
      )}
    >
      {status || "—"}
    </span>
  );
}

function sentimentDot(sentiment: "green" | "yellow" | "red" | null) {
  if (!sentiment) return <span className="text-[color:var(--text-muted)]">—</span>;
  const color =
    sentiment === "green"
      ? "bg-[color:var(--cta-green)]"
      : sentiment === "yellow"
        ? "bg-amber-500"
        : "bg-red-500/80";
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} title={sentiment} />;
}

export function CallHistoryTable({
  calls,
  loading,
}: {
  calls: CallRow[];
  loading: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[color:var(--border)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
        Call history
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
              <th className="w-8 px-2 py-3" />
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Duration</th>
              <th className="px-3 py-3">Agent</th>
              <th className="px-3 py-3">Call ID</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Country</th>
              <th className="px-3 py-3">Outcome</th>
              <th className="px-3 py-3">Escalation</th>
              <th className="px-3 py-3">Sentiment</th>
              <th className="max-w-[180px] px-3 py-3">Summary</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => {
              const isExpanded = expandedId === c.call_id;
              return (
                <Fragment key={c.call_id}>
                  <tr
                    key={c.call_id}
                    className={cn(
                      "border-b border-[color:var(--border)] transition-colors hover:bg-[color:var(--surface-0)]/60",
                      isExpanded && "bg-[color:var(--surface-0)]/80"
                    )}
                  >
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : c.call_id)}
                        className="flex items-center justify-center rounded p-1 text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-soft)]"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[color:var(--text-soft)]">
                      {formatTime(c.started_at)}
                    </td>
                    <td className="tabular-nums text-xs text-[color:var(--text-soft)]">
                      {formatDuration(c.duration_seconds)}
                    </td>
                    <td className="text-xs text-[color:var(--text-muted)]">
                      {c.user_id ? String(c.user_id).slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="font-mono text-xs text-[color:var(--text-soft)]">
                      {c.call_id.slice(0, 12)}…
                    </td>
                    <td className="font-mono text-xs text-[color:var(--text-soft)]">
                      {c.phone_number ?? "—"}
                    </td>
                    <td className="text-xs text-[color:var(--text-muted)]">
                      {countryFromPhone(c.phone_number)}
                    </td>
                    <td className="text-xs text-[color:var(--text-muted)]">{c.outcome ?? "—"}</td>
                    <td className="text-xs text-[color:var(--text-muted)]">—</td>
                    <td className="px-3 py-2">{sentimentDot(null)}</td>
                    <td className="max-w-[180px] truncate text-xs text-[color:var(--text-muted)]">
                      {summaryPreview(c.messages)}
                    </td>
                    <td>{statusBadge(c.status)}</td>
                  </tr>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.tr
                        key={`expanded-${c.call_id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b border-[color:var(--border)]"
                      >
                        <td colSpan={12} className="bg-[color:var(--surface-0)]/50 p-0">
                          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                                Full transcript
                              </div>
                              <div className="max-h-48 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]/50 p-3 text-xs text-[color:var(--text-soft)]">
                                {c.messages.length === 0 ? (
                                  "No transcript."
                                ) : (
                                  c.messages.map((m, i) => (
                                    <div key={i} className="mb-2">
                                      <span className="font-medium text-[color:var(--text-muted)]">
                                        {m.role}:
                                      </span>{" "}
                                      {m.text}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                                AI summary
                              </div>
                              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]/50 p-3 text-xs text-[color:var(--text-muted)]">
                                {summaryPreview(c.messages, 300)}
                              </div>
                              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                                Extracted data
                              </div>
                              <div className="mt-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]/50 p-3 text-xs text-[color:var(--text-muted)]">
                                —
                              </div>
                              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                                Risk flags
                              </div>
                              <div className="mt-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]/50 p-3 text-xs text-[color:var(--text-muted)]">
                                None
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
            {!loading && calls.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm text-[color:var(--text-muted)]">
                  No call history yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-sm text-[color:var(--text-muted)]">
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
