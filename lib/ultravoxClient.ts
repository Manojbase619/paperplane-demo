"use client";

export type UltravoxTranscriptEvent = {
  type: "transcript";
  speaker: "customer" | "agent";
  text: string;
  timestamp: number;
};

type Listener = (e: UltravoxTranscriptEvent) => void;

export class UltravoxClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws || !this.url) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data?.type === "transcript") {
          const evt: UltravoxTranscriptEvent = {
            type: "transcript",
            speaker:
              data.speaker === "agent" || data.speaker === "customer"
                ? data.speaker
                : "agent",
            text: String(data.text ?? "").trim(),
            timestamp:
              typeof data.timestamp === "number"
                ? data.timestamp
                : Date.now(),
          };
          if (!evt.text) return;
          this.listeners.forEach((l) => l(evt));
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      this.ws = null;
    };

    ws.onerror = () => {
      this.close();
    };
  }

  close() {
    if (!this.ws) return;
    try {
      this.ws.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  onTranscript(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

import { useEffect, useMemo, useState } from "react";

export function useUltravoxTranscript(enabled: boolean) {
  const [events, setEvents] = useState<UltravoxTranscriptEvent[]>([]);

  const client = useMemo(() => {
    if (!enabled) return null;
    const url =
      process.env.NEXT_PUBLIC_ULTRAVOX_WS_URL ??
      (typeof window !== "undefined"
        ? (window as any).__ULTRAVOX_WS_URL__
        : "");
    if (!url) return null;
    return new UltravoxClient(url);
  }, [enabled]);

  useEffect(() => {
    if (!client || !enabled) return;
    client.connect();
    const unsubscribe = client.onTranscript((evt) => {
      setEvents((prev) => [...prev, evt]);
    });
    return () => {
      unsubscribe();
      client.close();
    };
  }, [client, enabled]);

  return events;
}

