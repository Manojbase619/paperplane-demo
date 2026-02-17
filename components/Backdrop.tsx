"use client";

import { motion } from "framer-motion";

export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-dvh bg-[color:var(--bg0)]">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.19, 1, 0.22, 1],
        }}
        style={{
          background:
            "radial-gradient(880px 580px at -10% -10%, rgba(99,102,241,.06), transparent 65%), radial-gradient(820px 520px at 110% 0%, rgba(99,102,241,.04), transparent 65%), linear-gradient(180deg, var(--bg0), var(--surface-1))",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
