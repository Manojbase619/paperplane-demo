"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SMOOTHING = 0.32;
const MIN_LEVEL = 0.08;
const PEAK_DECAY = 0.9;

export function VoiceReactiveVisual({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const [level, setLevel] = useState(0);
  const smoothedRef = useRef(0);
  const peakRef = useRef(0);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      smoothedRef.current = 0;
      peakRef.current = 0;
      setLevel(0);
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
        analyser.smoothingTimeConstant = 0.5;
        analyser.minDecibels = -55;
        analyser.maxDecibels = -8;
        src.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);
        dataRef.current = data;

        function tick() {
          if (cancelled || !analyserRef.current || !dataRef.current) return;
          analyserRef.current.getByteFrequencyData(dataRef.current);
          const sum = dataRef.current.reduce((a, b) => a + b, 0);
          const raw = Math.min(1, (sum / bufferLength / 255) * 2.8);
          const target = raw < 0.01 ? MIN_LEVEL : Math.max(MIN_LEVEL, raw);
          smoothedRef.current =
            smoothedRef.current + (target - smoothedRef.current) * SMOOTHING;
          if (smoothedRef.current > peakRef.current) peakRef.current = smoothedRef.current;
          else peakRef.current *= PEAK_DECAY;
          const display = Math.max(smoothedRef.current, peakRef.current * 0.35);
          setLevel(display);
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setLevel(0);
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

  const talking = active && level > 0.2;
  const scale = active ? 0.9 + level * 0.45 : 0.96;
  const glow = active
    ? `0 0 ${50 + level * 100}px rgba(0,245,212,${0.25 + level * 0.55}), 0 0 ${100 + level * 140}px rgba(255,46,99,${0.2 + level * 0.45})`
    : "0 0 40px rgba(0,245,212,0.15), 0 0 80px rgba(255,46,99,0.1)";

  const ringSpeedCyan = talking ? 8 - level * 4 : 18;
  const ringSpeedMagenta = talking ? 10 - level * 5 : 22;

  return (
    <div className={cn("flex flex-1 items-center justify-center", className)}>
      <motion.div
        className="relative rounded-full"
        style={{
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,.22), transparent 48%), radial-gradient(circle at 70% 68%, rgba(0,245,212,.4), transparent 52%), radial-gradient(circle at 50% 55%, rgba(5,7,22,.98), rgba(3,4,16,1))",
          boxShadow: glow,
        }}
        animate={{
          scale,
          rotate: active ? (talking ? [0, 4, -3, 2, 0] : [0, 1.5, -1, 0.5, 0]) : [0, 0.8, 0],
        }}
        transition={{
          scale: { type: "spring", stiffness: 280, damping: 20 },
          rotate: {
            duration: talking ? 1.2 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,245,212,.35), transparent 62%), radial-gradient(circle at 45% 45%, rgba(255,46,99,.25), transparent 58%)",
          }}
          animate={{
            opacity: active ? 0.5 + level * 0.5 : 0.35,
            scale: active ? 0.92 + level * 0.2 : 1,
          }}
          transition={{ opacity: { duration: 0.08 }, scale: { duration: 0.06 } }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-[-20px] rounded-full border-2 border-[rgba(0,245,212,0.5)]"
          style={{ borderColor: `rgba(0,245,212,${0.35 + level * 0.5})` }}
          animate={{
            rotate: 360,
            scale: talking ? 1 + level * 0.15 : 1,
          }}
          transition={{
            rotate: { duration: ringSpeedCyan, repeat: Infinity, ease: "linear" },
            scale: { type: "spring", stiffness: 200, damping: 18 },
          }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-[-36px] rounded-full border-2 border-[rgba(255,46,99,0.4)]"
          style={{ borderColor: `rgba(255,46,99,${0.3 + level * 0.45})` }}
          animate={{
            rotate: -360,
            scale: talking ? 1 + level * 0.12 : 1,
          }}
          transition={{
            rotate: { duration: ringSpeedMagenta, repeat: Infinity, ease: "linear" },
            scale: { type: "spring", stiffness: 200, damping: 18 },
          }}
        />
        {active && (
          <>
            <motion.div
              aria-hidden
              className="absolute inset-[-56px] rounded-full border border-[rgba(0,245,212,0.25)]"
              animate={{
                scale: [1, 1 + level * 0.25, 1],
                opacity: [0.4, 0.2 + level * 0.4, 0.4],
              }}
              transition={{
                scale: { duration: 0.25, repeat: Infinity, ease: "easeOut" },
                opacity: { duration: 0.25, repeat: Infinity },
              }}
            />
            <motion.div
              aria-hidden
              className="absolute inset-[-72px] rounded-full border border-[rgba(255,46,99,0.2)]"
              animate={{
                scale: [1, 1 + level * 0.2, 1],
                opacity: [0.3, 0.15 + level * 0.35, 0.3],
              }}
              transition={{
                scale: { duration: 0.3, repeat: Infinity, ease: "easeOut" },
                opacity: { duration: 0.3, repeat: Infinity },
              }}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
