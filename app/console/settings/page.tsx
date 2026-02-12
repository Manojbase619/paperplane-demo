"use client";

import { Card } from "@/components/Card";

export default function ConsoleSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
          Settings
        </div>
        <h1 className="mt-1 text-2xl text-[color:var(--text-soft)] md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Demo-safe settings screen (no auth complexity).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
            Workspace
          </div>
          <div className="mt-3 space-y-3 text-sm text-[color:var(--text-soft)]">
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-0)] px-3 py-2">
              <span>Default timezone</span>
              <span className="font-mono text-xs text-[color:var(--text-muted)]">Local</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-0)] px-3 py-2">
              <span>Theme</span>
              <span className="font-mono text-xs text-[color:var(--accent)]">Light · Purple</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
            Notifications
          </div>
          <div className="mt-3 space-y-3 text-sm text-[color:var(--text-soft)]">
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-0)] px-3 py-2">
              <span>Call ended summaries</span>
              <span className="font-mono text-xs text-[color:var(--text-muted)]">On</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-0)] px-3 py-2">
              <span>Live call alerts</span>
              <span className="font-mono text-xs text-[color:var(--text-muted)]">On</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

