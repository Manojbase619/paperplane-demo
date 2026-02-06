"use client";

import { motion } from "framer-motion";

export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-dvh">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.95 }}
        transition={{
          duration: 0.9,
          ease: [0.19, 1, 0.22, 1],
        }}
        style={{
          background:
            "radial-gradient(880px 580px at -10% -10%, rgba(0,245,212,.22), transparent 65%), radial-gradient(820px 520px at 110% -10%, rgba(255,46,99,.22), transparent 65%), radial-gradient(1080px 820px at 50% 120%, rgba(3,5,20,.96), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

