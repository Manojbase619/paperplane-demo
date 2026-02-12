"use client";

import { useEffect, useState } from "react";

export type AdminStats = {
  date: string;
  usage: Array<{ phone: string; usage_date: string; callsCount: number; totalDurationSeconds: number }>;
  activeCalls: Array<{ id: string; phone: string; startedAt: string; durationSeconds: number }>;
};

const POLL_MS = 3000;

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled && json) setStats(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    const t = setInterval(fetchStats, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { stats, loading };
}
