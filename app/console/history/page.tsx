"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CallHistoryTable, type CallRow } from "@/components/CallHistoryTable";

export default function ConsoleHistoryPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/calls?limit=50", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled) setCalls((json?.calls ?? []) as CallRow[]);
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
  }, []);

  return (
    <motion.div
      className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]">
          Call History
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--text-soft)] md:text-3xl">
          History
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Recent calls with full transcript and details. Refreshes every 5 seconds.
        </p>
      </div>

      <CallHistoryTable calls={calls} loading={loading} />
    </motion.div>
  );
}
