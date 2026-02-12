"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Download,
  Shield,
  PhoneCall,
  Clock,
  Users,
  Activity,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  LogOut,
} from "lucide-react";

import { Backdrop } from "@/components/Backdrop";
import { Card } from "@/components/Card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser, getDisplayName, clearCurrentUser } from "@/lib/storage";
import { type AdminStats } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const ADMIN_PHONES = ["9655071573", "9886975211"];

type AdminCallRow = {
  call_id: string;
  phone_number: string | null;
  user_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  messages: { role: string; text: string; ordinal: number; timestamp?: string }[];
};

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMinutes(seconds: number) {
  return (seconds / 60).toFixed(1);
}

export default function AdminPage() {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [calls, setCalls] = useState<AdminCallRow[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [callsLoading, setCallsLoading] = useState(true);

  const displayName = getDisplayName(user);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AdminStats;
        if (!cancelled) setStats(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    const t = window.setInterval(loadStats, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadCalls() {
      setCallsLoading(true);
      try {
        const res = await fetch("/api/admin/calls?limit=50", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.calls) setCalls(data.calls);
      } finally {
        if (!cancelled) setCallsLoading(false);
      }
    }

    loadCalls();
    const t = window.setInterval(loadCalls, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [user]);

  function exportCsv(scope: "today" | "all") {
    if (!user) return;
    const url = `/api/admin/export?scope=${scope}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.click();
  }

  function handleLogout() {
    clearCurrentUser();
    setUser(null);
    setStats(null);
    setCalls([]);
  }

  const totalCallsToday = stats?.usage.reduce((acc, u) => acc + u.callsCount, 0) ?? 0;
  const totalMinutesToday =
    stats?.usage.reduce((acc, u) => acc + u.totalDurationSeconds, 0) ?? 0;
  const activeCount = stats?.activeCalls.length ?? 0;

  return (
    <Backdrop>
      <main className="mx-auto min-h-dvh max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)]">
              Basethesis
            </div>
            <h1 className="mt-1 text-2xl font-medium text-[color:var(--text-soft)] md:text-3xl">
              Command Center
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
              Live ops, transcripts, timings, exports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle size="sm" />
            {user && (
              <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-0)] px-4 py-2 text-xs text-[color:var(--text-soft)]">
                <span className="text-[color:var(--text-muted)]">Signed in as</span> {displayName || user.phone}
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-muted)] hover:bg-[color:var(--surface-0)] hover:text-[color:var(--text-soft)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-[color:var(--accent)]/20 p-5">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-[color:var(--accent)]/10" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent)]/20">
                <PhoneCall className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-[color:var(--text-soft)]">
                  {loading ? "—" : totalCallsToday}
                </div>
                <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                  Calls today
                </div>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden border-[color:var(--accent-strong)]/20 p-5">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-[color:var(--accent-strong)]/10" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent-strong)]/20">
                <Activity className="h-5 w-5 text-[color:var(--accent-strong)]" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-[color:var(--text-soft)]">
                  {loading ? "—" : activeCount}
                </div>
                <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                  Live now
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent)]/10">
                <Clock className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-[color:var(--text-soft)]">
                  {loading ? "—" : formatMinutes(totalMinutesToday)}
                </div>
                <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                  Min today
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent)]/10">
                <Users className="h-5 w-5 text-[color:var(--accent)]" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-[color:var(--text-soft)]">
                  {loading ? "—" : stats?.usage.length ?? 0}
                </div>
                <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                  Users today
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent calls + transcripts */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--border)] px-5 py-4 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-soft)]">
                <MessageSquare className="h-4 w-4 text-[color:var(--accent)]" />
                Recent calls & transcripts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportCsv("today")}
                  className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-soft)] hover:bg-[color:var(--surface-0)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Today CSV
                </button>
                <button
                  onClick={() => exportCsv("all")}
                  className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-soft)] hover:bg-[color:var(--surface-0)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  All CSV
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            {callsLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-[color:var(--text-muted)]">
                Loading calls…
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PhoneCall className="mb-3 h-10 w-10 text-[color:var(--text-muted)]" />
                <p className="text-sm text-[color:var(--text-muted)]">No call records yet</p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  Calls created via the deck and ended via webhook will appear here with transcripts.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                    <th className="w-8 px-4 py-3" />
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => {
                    const isExpanded = expandedCallId === call.call_id;
                    return (
                      <Fragment key={call.call_id}>
                        <tr
                          key={call.call_id}
                          className={cn(
                            "border-b border-[color:var(--border)] transition-colors hover:bg-[color:var(--surface-0)]",
                            isExpanded && "bg-[color:var(--surface-0)]"
                          )}
                        >
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCallId(isExpanded ? null : call.call_id)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded text-[color:var(--text-muted)] hover:bg-[color:var(--accent)]/10 hover:text-[color:var(--accent)]"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="font-mono text-xs text-[color:var(--text-soft)]">
                            {formatTime(call.started_at)}
                          </td>
                          <td className="font-mono text-xs text-[color:var(--text-soft)]">
                            {call.phone_number ?? call.user_id ?? "—"}
                          </td>
                          <td className="font-mono text-xs tabular-nums text-[color:var(--text-soft)]">
                            {formatDuration(call.duration_seconds ?? 0)}
                          </td>
                          <td>
                            <span
                              className={cn(
                                "inline-flex rounded px-2 py-0.5 text-[11px] font-medium uppercase",
                                call.status === "active"
                                  ? "bg-[color:var(--accent)]/20 text-[color:var(--accent)]"
                                  : call.status === "ended"
                                    ? "bg-[color:var(--surface-0)] text-[color:var(--text-soft)]"
                                    : "bg-[color:var(--surface-0)] text-[color:var(--text-muted)]"
                              )}
                            >
                              {call.status}
                            </span>
                          </td>
                          <td className="text-xs text-[color:var(--text-muted)]">{call.outcome ?? "—"}</td>
                          <td className="font-mono text-xs text-[color:var(--text-muted)]">
                            {call.messages?.length ?? 0}
                          </td>
                        </tr>
                        {isExpanded && call.messages && call.messages.length > 0 && (
                          <tr key={`${call.call_id}-exp`} className="border-b border-[color:var(--border)] bg-[color:var(--surface-0)]">
                            <td colSpan={7} className="p-0">
                              <div className="border-t border-[color:var(--border)] px-4 py-4 md:px-6">
                                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
                                  Transcript
                                </div>
                                <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 font-mono text-xs">
                                  {call.messages
                                    .sort((a, b) => a.ordinal - b.ordinal)
                                    .map((msg, i) => (
                                      <div
                                        key={i}
                                        className={cn(
                                          "flex gap-3 rounded px-2 py-1.5",
                                          msg.role === "user"
                                            ? "bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                                            : msg.role === "agent"
                                              ? "bg-[color:var(--accent)]/5 text-[color:var(--text-soft)]"
                                              : "bg-[color:var(--surface-0)] text-[color:var(--text-muted)]"
                                        )}
                                      >
                                        <span className="shrink-0 w-14 uppercase text-[color:var(--text-muted)]">
                                          {msg.role}
                                        </span>
                                        <span className="break-words text-[color:var(--text-soft)]">{msg.text}</span>
                                        {msg.timestamp && (
                                          <span className="ml-auto shrink-0 text-[color:var(--text-muted)]">
                                            {formatTime(msg.timestamp)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {isExpanded && (!call.messages || call.messages.length === 0) && (
                          <tr key={`${call.call_id}-exp`} className="border-b border-[color:var(--border)] bg-[color:var(--surface-0)]">
                            <td colSpan={7} className="px-4 py-4 text-xs text-[color:var(--text-muted)] md:px-6">
                              No transcript for this call.
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Daily usage table (compact) */}
        {stats && stats.usage.length > 0 && (
          <Card className="mt-8 overflow-hidden p-0">
            <div className="border-b border-[color:var(--border)] px-5 py-3 md:px-6">
              <div className="text-xs font-medium uppercase tracking-wider text-[color:var(--text-soft)]">
                Daily usage · {stats.date}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[color:var(--border)] text-[11px] uppercase text-[color:var(--text-muted)]">
                    <th className="px-4 py-2">Phone</th>
                    <th className="px-4 py-2">Calls</th>
                    <th className="px-4 py-2">Minutes</th>
                    <th className="px-4 py-2">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.usage.map((u) => (
                    <tr key={u.phone} className="border-b border-[color:var(--border)]">
                      <td className="font-mono py-2 px-4 text-[color:var(--text-soft)]">{u.phone}</td>
                      <td className="py-2 px-4">{u.callsCount}</td>
                      <td className="py-2 px-4">{formatMinutes(u.totalDurationSeconds)}</td>
                      <td className="py-2 px-4">
                        {u.remainingCalls} calls, {formatMinutes(u.remainingSeconds)} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </Backdrop>
  );
}
