"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BAR_COUNT = 9;
const SMOOTHING = 0.28;
const MIN_HEIGHT = 0.12;

export function VoiceReactiveVisual({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const [levels, setLevels] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(MIN_HEIGHT)
  );
  const smoothedRef = useRef<number[]>(Array(BAR_COUNT).fill(MIN_HEIGHT));
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array>(new Uint8Array(0));

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      smoothedRef.current = Array(BAR_COUNT).fill(MIN_HEIGHT);
      setLevels(Array(BAR_COUNT).fill(MIN_HEIGHT));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        contextRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        analyser.minDecibels = -55;
        analyser.maxDecibels = -8;
        src.connect(analyser);
        analyserRef.current = analyser;
        const bufferLength = analyser.frequencyBinCount;
        dataRef.current = new Uint8Array(bufferLength);

        function tick() {
          if (cancelled || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(
            dataRef.current as unknown as Uint8Array<ArrayBuffer>
          );
          const step = Math.floor(bufferLength / BAR_COUNT);
          const next = smoothedRef.current.slice();
          for (let i = 0; i < BAR_COUNT; i++) {
            const start = i * step;
            let sum = 0;
            for (let j = 0; j < step; j++) sum += dataRef.current[start + j] ?? 0;
            const raw = Math.min(1, (sum / step / 255) * 2.2);
            const target = raw < 0.02 ? MIN_HEIGHT : Math.max(MIN_HEIGHT, raw);
            next[i] += (target - next[i]) * SMOOTHING;
          }
          smoothedRef.current = next;
          setLevels([...next]);
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setLevels(Array(BAR_COUNT).fill(MIN_HEIGHT));
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      contextRef.current?.close();
      contextRef.current = null;
      analyserRef.current = null;
    };
  }, [active]);

  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 py-6 rounded-2xl",
        active && "voice-visual-container active-glow",
        className
      )}
    >
      {levels.map((h, i) => (
        <div
          key={i}
          className={cn(
            "w-2 rounded-full bg-[color:var(--accent)] transition-all duration-75 ease-out voice-visual-bar",
            active && "active-shine",
            !active && "idle-breathe"
          )}
          style={{
            height: 24 + (active ? h * 80 : 0.2 * 40),
            minHeight: 24,
            opacity: active ? 0.7 + h * 0.3 : undefined,
            animationDelay: !active ? `${i * 0.08}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}
