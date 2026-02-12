"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { AgentStatus } from "@/lib/agent";
import { cn } from "@/lib/utils";

const LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  listening: "Listening",
  speaking: "Speaking",
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const active = status !== "idle";
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
        active
          ? "border-success/30 bg-success/10 text-success"
          : "border-[color:var(--border)] bg-[color:var(--surface-0)] text-[color:var(--text-muted)]"
      )}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active ? "bg-success" : "bg-[color:var(--text-muted)]"
          )}
        />
        <AnimatePresence>
          {active && (
            <motion.span
              className="absolute inset-0 rounded-full border border-success/70"
              initial={{ opacity: 0.1, scale: 1 }}
              animate={{ opacity: [0.15, 0.6, 0.15], scale: [1, 1.9, 1] }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
      </span>
      <span>{LABEL[status]}</span>
    </div>
  );
}

