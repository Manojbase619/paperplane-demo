"use client";

import { motion } from "framer-motion";

import type { AgentStatus } from "@/lib/agent";
import { cn } from "@/lib/utils";

export function Orb({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) {
  const speaking = status === "speaking";
  const listening = status === "listening";
  const idle = status === "idle";

  const glow =
    speaking || listening
      ? "0 0 0 1px rgba(108,62,232,.5), 0 0 40px rgba(108,62,232,.4), 0 0 100px rgba(108,62,232,.25)"
      : "0 0 0 1px rgba(108,62,232,.25), 0 0 60px rgba(108,62,232,.2), 0 0 100px rgba(108,62,232,.12)";

  return (
    <div className={cn("relative", className)}>
      <motion.div
        className="relative mx-auto aspect-square w-[240px] max-w-full rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,.35), transparent 45%), radial-gradient(circle at 72% 68%, rgba(108,62,232,.25), transparent 55%), radial-gradient(circle at 50% 60%, rgba(248,249,250,1), rgba(236,236,239,1))",
          boxShadow: glow,
        }}
        initial={false}
        animate={{
          scale: idle ? [1, 1.03, 1] : listening ? [1, 1.05, 0.98, 1.04, 1] : [1, 1.12, 0.98, 1.08, 1],
          rotate: idle ? [0, 1.5, 0] : listening ? [0, -2.5, 1.2, 0] : [0, 4.2, -3.8, 5.2, 0],
        }}
        transition={{
          duration: speaking ? 1.0 : listening ? 1.8 : 4.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Soft inner aura */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 55%, rgba(108,62,232,.2), transparent 60%), radial-gradient(circle at 45% 40%, rgba(108,62,232,.12), transparent 55%)",
          }}
          animate={{
            opacity: speaking ? [0.7, 1, 0.7] : listening ? [0.45, 0.8, 0.5] : [0.3, 0.5, 0.35],
            filter: speaking ? ["blur(10px)", "blur(14px)", "blur(10px)"] : ["blur(12px)", "blur(14px)", "blur(12px)"],
          }}
          transition={{
            duration: speaking ? 1.1 : 3.0,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Orbiting rings */}
        <motion.div
          aria-hidden
          className="absolute inset-[-18px] rounded-full border border-[rgba(0,245,212,0.35)]"
          animate={{ rotate: speaking ? 110 : 40 }}
          transition={{ duration: speaking ? 6 : 12, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-[-34px] rounded-full border border-[rgba(255,46,99,0.35)]"
          animate={{ rotate: speaking ? -140 : -50 }}
          transition={{ duration: speaking ? 7 : 16, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}

