"use client";

import { Card } from "@/components/Card";

export default function ConsoleAnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
          Call Analytics
        </div>
        <h1 className="mt-1 text-2xl text-[color:var(--text-soft)] md:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Event model wired; charts can be added next.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
            Events (placeholder)
          </div>
          <div className="mt-3 h-56 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-0)]" />
          <p className="mt-3 text-xs text-[color:var(--text-muted)]">
            Hook this to `analytics_events` for real graphs.
          </p>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
            Funnels (placeholder)
          </div>
          <div className="mt-3 h-56 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-0)]" />
          <p className="mt-3 text-xs text-[color:var(--text-muted)]">
            Placeholder for charts and funnels.
          </p>
        </Card>
      </div>
    </div>
  );
}

