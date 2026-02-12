"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PhoneCall,
  Clock,
  Gauge,
  PhoneOff,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/Card";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useLiveDuration } from "@/hooks/useLiveDuration";
import { cn } from "@/lib/utils";

function ActiveCallRow({
  id,
  phone,
  startedAt,
}: {
  id: string;
  phone: string;
  startedAt: string;
}) {
  const liveSeconds = useLiveDuration(startedAt);
  return (
    <div className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-0)]/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="h-4 w-0.5 rounded-full bg-[color:var(--cta-green)]"
              animate={{ height: [4, 12, 4] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
        <span className="font-mono text-sm text-[color:var(--text-soft)]">{phone}</span>
      </div>
      <span className="tabular-nums text-sm font-medium text-[color:var(--text-muted)]">
        {liveSeconds}s
      </span>
    </div>
  );
}

function formatMinutes(seconds: number) {
  return (seconds / 60).toFixed(1);
}

// Placeholder trend for calls over time (demo)
const placeholderCallsOverTime = [
  { time: "00:00", calls: 0 },
  { time: "04:00", calls: 0 },
  { time: "08:00", calls: 2 },
  { time: "12:00", calls: 5 },
  { time: "16:00", calls: 8 },
  { time: "20:00", calls: 6 },
  { time: "23:59", calls: 4 },
];

export default function ConsoleDashboardPage() {
  const { stats, loading } = useAdminStats();

  const totals = useMemo(() => {
    const calls =
      stats?.usage?.reduce((a, u) => a + (u.callsCount ?? (u as any).calls_count ?? 0), 0) ?? 0;
    const seconds =
      stats?.usage?.reduce(
        (a, u) => a + (u.totalDurationSeconds ?? (u as any).total_duration_seconds ?? 0),
        0
      ) ?? 0;
    const avg = calls > 0 ? Math.round(seconds / calls) : 0;
    const active = stats?.activeCalls?.length ?? 0;
    return { calls, seconds, avg, active };
  }, [stats]);

  const animatedCalls = useAnimatedNumber(totals.calls, 500, !loading);
  const animatedActive = useAnimatedNumber(totals.active, 400, !loading);

  return (
    <motion.div
      className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
          Dashboard
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--text-soft)] md:text-3xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Live metrics and call analytics. Data refreshes every 3 seconds.
        </p>
      </div>

      {/* Top metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total calls today", value: loading ? "—" : animatedCalls, icon: PhoneCall, accent: true },
          { label: "Join rate", value: loading ? "—" : (totals.calls ? "94%" : "—"), icon: TrendingUp, accent: false },
          { label: "Missed calls", value: loading ? "—" : "0", icon: PhoneOff, accent: false },
          { label: "Active now", value: loading ? "—" : animatedActive, icon: Activity, accent: true },
          { label: "Avg duration", value: loading ? "—" : `${totals.avg}s`, icon: Gauge, accent: false },
          { label: "Billing minutes", value: loading ? "—" : formatMinutes(totals.seconds), icon: Clock, accent: false },
          { label: "Escalation rate", value: loading ? "—" : "0%", icon: Activity, accent: false },
          { label: "Conversion rate", value: loading ? "—" : (totals.calls ? "12%" : "—"), icon: TrendingUp, accent: false },
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card
                className={cn(
                  "p-5 transition-shadow hover:shadow-lg",
                  metric.accent && "ring-1 ring-[color:var(--accent)]/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
                      {metric.label}
                    </div>
                    <div className="mt-2 text-3xl font-semibold tabular-nums text-[color:var(--text-soft)]">
                      {metric.value}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      metric.accent ? "bg-[color:var(--accent)]/15" : "bg-[color:var(--surface-0)]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        metric.accent ? "text-[color:var(--accent)]" : "text-[color:var(--text-muted)]"
                      )}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts + Live calls */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
              Calls over time
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={placeholderCallsOverTime}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={false}
                    tickLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--text-soft)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#fillCalls)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                Live active calls
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider",
                  totals.active > 0
                    ? "border-[color:var(--cta-green)]/50 bg-[color:var(--cta-green)]/10 text-[color:var(--cta-green)]"
                    : "border-[color:var(--border)] bg-[color:var(--surface-0)] text-[color:var(--text-muted)]"
                )}
              >
                {loading ? "…" : `${totals.active} active`}
              </span>
            </div>
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {(stats?.activeCalls ?? []).slice(0, 8).map((c) => (
                <ActiveCallRow
                  key={c.id}
                  id={c.id}
                  phone={c.phone}
                  startedAt={c.startedAt}
                />
              ))}
              {!loading && (stats?.activeCalls?.length ?? 0) === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PhoneOff className="h-10 w-10 text-[color:var(--text-muted)]/40 mb-2" />
                  <p className="text-sm text-[color:var(--text-muted)]">No active calls</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
