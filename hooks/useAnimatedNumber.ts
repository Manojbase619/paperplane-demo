"use client";

import { useEffect, useState } from "react";

/**
 * Animates a number from 0 (or previous) to target for dashboard metric cards.
 */
export function useAnimatedNumber(
  value: number,
  durationMs: number = 600,
  enabled: boolean = true
): number {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!enabled) {
      setDisplay(value);
      return;
    }
    const start = display;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const easeOut = 1 - Math.pow(1 - t, 2);
      setDisplay(Math.round(start + (value - start) * easeOut));
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [value, enabled, durationMs]);

  return display;
}
