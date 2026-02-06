"use client";

import { useEffect, useState } from "react";
import { Download, Shield, Timer, PhoneCall } from "lucide-react";

import { Backdrop } from "@/components/Backdrop";
import { Card } from "@/components/Card";
import { STORAGE_KEYS, safeGetLocalStorageItem } from "@/lib/storage";
import { type AdminStats } from "@/lib/analytics";
import { normalizeAdminPhone } from "@/lib/analytics";

const ADMIN_PHONES = ["9655071573", "9886975211"];

function formatMinutes(seconds: number) {
  return (seconds / 60).toFixed(1);
}

export default function AdminPage() {
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizedAdmin = adminPhone ? normalizeAdminPhone(adminPhone) : null;
  const isAuthorized =
    !!normalizedAdmin && ADMIN_PHONES.includes(normalizedAdmin);

  useEffect(() => {
    const stored = safeGetLocalStorageItem(STORAGE_KEYS.phone);
    if (!stored) {
      setAdminPhone(null);
      setLoading(false);
      return;
    }
    setAdminPhone(stored);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/stats", {
          headers: {
            "x-admin-phone": normalizedAdmin ?? "",
          },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as AdminStats;
        if (!cancelled) setStats(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [isAuthorized, normalizedAdmin]);

  function exportCsv(scope: "today" | "all") {
    if (!normalizedAdmin) return;
    const url = `/api/admin/export?scope=${scope}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.click();
  }

  if (!isAuthorized) {
    return (
      <Backdrop>
        <main className="flex min-h-dvh items-center justify-center px-5">
          <Card className="max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]">
              <Shield className="h-5 w-5 text-white/80" />
            </div>
            <div className="text-lg text-white">Admin access only</div>
            <p className="mt-2 text-sm text-white/55">
              Sign in with an admin phone number to view live analytics.
            </p>
          </Card>
        </main>
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      <main className="mx-auto min-h-dvh max-w-6xl px-5 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl text-white">Paperplane Admin</h1>
            <p className="mt-1 text-xs text-white/55">
              Live usage, quotas, and exports
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/65">
            Admin {normalizedAdmin}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-white/85">
                <PhoneCall className="h-4 w-4" />
                Daily usage
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-white/70">
                <thead className="border-b border-white/10 text-[11px] uppercase text-white/45">
                  <tr>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Calls</th>
                    <th className="py-2 pr-4">Minutes used</th>
                    <th className="py-2 pr-4">Remaining calls</th>
                    <th className="py-2 pr-4">Remaining minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.usage.map((u) => (
                    <tr key={`${u.phone}-${u.date}`} className="border-b border-white/[0.04]">
                      <td className="py-2 pr-4 text-white/80">{u.phone}</td>
                      <td className="py-2 pr-4">{u.callsCount}</td>
                      <td className="py-2 pr-4">
                        {formatMinutes(u.totalDurationSeconds)}
                      </td>
                      <td className="py-2 pr-4">{u.remainingCalls}</td>
                      <td className="py-2 pr-4">
                        {formatMinutes(u.remainingSeconds)}
                      </td>
                    </tr>
                  ))}
                  {stats?.usage.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-xs text-white/45"
                      >
                        {loading ? "Loading…" : "No usage yet today."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-5">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm text-white/85">
                <Timer className="h-4 w-4" />
                Live calls
              </div>
              <div className="space-y-2">
                {stats?.activeCalls.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="text-white/85">{c.phone}</div>
                      <div className="text-[11px] text-white/45">
                        {c.durationSeconds}s live
                      </div>
                    </div>
                    <button className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] text-red-300">
                      Force end
                    </button>
                  </div>
                ))}
                {stats?.activeCalls.length === 0 && (
                  <div className="py-4 text-center text-xs text-white/45">
                    {loading ? "Loading…" : "No active calls."}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm text-white/85">
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => exportCsv("today")}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-white/80 hover:bg-white/[0.06]"
                >
                  <span>Export today&apos;s calls</span>
                  <span className="text-[11px] text-white/45">CSV</span>
                </button>
                <button
                  onClick={() => exportCsv("all")}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-white/80 hover:bg-white/[0.06]"
                >
                  <span>Export all history</span>
                  <span className="text-[11px] text-white/45">CSV</span>
                </button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </Backdrop>
  );
}

