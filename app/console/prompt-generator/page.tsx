"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Phone,
  Rocket,
  RefreshCw,
  Edit3,
  Loader2,
} from "lucide-react";
import { EMPTY_STATE, type PromptChatState } from "@/lib/prompt-chat-state";

const PENDING_PROMPT_KEY = "basethesis_voice_pending_prompt";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function PromptGeneratorPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<PromptChatState>(EMPTY_STATE);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editPromptText, setEditPromptText] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const canSend = input.trim().length > 0 && !loading;
  const showPromptOutput = generatedPrompt.length > 0 && !editingPrompt;

  async function startConversation() {
    setLoading(true);
    setError(null);
    setMessages([]);
    setState(EMPTY_STATE);
    setGeneratedPrompt("");

    try {
      const res = await fetch("/api/prompt-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], state: EMPTY_STATE }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");

      const assistantMessage = typeof data.message === "string" ? data.message : "What is the agent's role?";
      setMessages([{ role: "assistant", content: assistantMessage }]);
      if (data.state && typeof data.state === "object") {
        setState({ ...EMPTY_STATE, ...data.state });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/prompt-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          state,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (data.state && typeof data.state === "object") {
        setState({ ...EMPTY_STATE, ...data.state });
      }

      const assistantContent = typeof data.message === "string" ? data.message : "";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);

      if (data.action === "generate" && data.fullPrompt) {
        setGeneratedPrompt(data.fullPrompt);
        setEditPromptText(data.fullPrompt);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy() {
    const promptToDeploy = editingPrompt ? editPromptText : generatedPrompt;
    if (!promptToDeploy.trim()) return;
    setDeploying(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/deploy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToDeploy.trim(), userId: null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) setError(json.error || "Deploy failed");
      else setSuccess("Your agent is updated and ready for voice calls.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  function handleStartCall() {
    const promptToUse = editingPrompt ? editPromptText : generatedPrompt;
    if (!promptToUse.trim()) return;
    if (typeof sessionStorage !== "undefined")
      sessionStorage.setItem(PENDING_PROMPT_KEY, promptToUse.trim());
    router.push("/dashboard");
  }

  function handleRegenerate() {
    setGeneratedPrompt("");
    setEditingPrompt(false);
    setEditPromptText("");
    startConversation();
  }

  const displayPrompt = editingPrompt ? editPromptText : generatedPrompt;

  return (
    <motion.div
      className="flex flex-1 flex-col h-[calc(100dvh-3rem)] min-h-0 bg-[color:var(--bg0)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-1 flex-col min-w-0 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="shrink-0 border-b border-[color:var(--border)] bg-[color:var(--surface-0)]/80 px-4 py-3">
          <h1 className="text-lg font-semibold text-[color:var(--text-soft)]">
            Prompt Generator
          </h1>
          <p className="text-xs text-[color:var(--text-muted)] mt-0.5">
            Answer a few questions; the AI will build your voice agent prompt.
          </p>
        </div>

        {/* Chat or CTA */}
        {messages.length === 0 && !loading && !generatedPrompt && (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent)]/15 text-[color:var(--accent)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[color:var(--text-soft)]">
                Generate Prompt
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[color:var(--text-muted)]">
                Start a short conversation. The AI will ask questions one by one and build a structured prompt for your voice agent.
              </p>
              <button
                type="button"
                onClick={startConversation}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[color:var(--cta-green)] px-5 py-3 text-sm font-medium text-white shadow-sm hover:opacity-95"
              >
                <Sparkles className="h-4 w-4" />
                Start
              </button>
            </div>
          </div>
        )}

        {/* Chat + optional prompt output */}
        {(messages.length > 0 || loading || generatedPrompt) && (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
            >
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-[color:var(--surface-2)] text-[color:var(--text-soft)] border border-[color:var(--border)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-2 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)] px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[color:var(--accent)]" />
                    <span className="text-sm text-[color:var(--text-muted)]">Thinking…</span>
                  </div>
                </motion.div>
              )}
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Final prompt card */}
              {showPromptOutput && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] overflow-hidden shadow-sm"
                >
                  <div className="border-b border-[color:var(--border)] bg-[color:var(--surface-0)]/60 px-4 py-3">
                    <h3 className="text-sm font-semibold text-[color:var(--text-soft)]">
                      Your prompt
                    </h3>
                    <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">
                      Ready to deploy or edit below.
                    </p>
                  </div>
                  <div className="p-4 max-h-[320px] overflow-y-auto">
                    <pre className="text-[13px] leading-relaxed text-[color:var(--text-soft)] whitespace-pre-wrap font-sans m-0">
                      {displayPrompt}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-[color:var(--border)] p-3 bg-[color:var(--surface-0)]/40">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPrompt(true);
                        setEditPromptText(displayPrompt);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs font-medium text-[color:var(--text-soft)] hover:bg-[color:var(--surface-0)]"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit prompt
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs font-medium text-[color:var(--text-soft)] hover:bg-[color:var(--surface-0)]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCall}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--cta-green)] px-3 py-2 text-xs font-medium text-white hover:opacity-95"
                    >
                      <Phone className="h-3.5 w-3.5" /> Start prompt call
                    </button>
                    <button
                      type="button"
                      onClick={handleDeploy}
                      disabled={deploying}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-50"
                    >
                      <Rocket className="h-3.5 w-3.5" /> {deploying ? "Deploying…" : "Deploy to Agent"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Edit mode: textarea */}
              {editingPrompt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-1)] overflow-hidden"
                >
                  <div className="border-b border-[color:var(--border)] px-4 py-2 text-xs font-medium text-[color:var(--text-muted)]">
                    Edit prompt
                  </div>
                  <textarea
                    value={editPromptText}
                    onChange={(e) => setEditPromptText(e.target.value)}
                    rows={14}
                    className="w-full resize-none border-0 bg-[color:var(--surface-2)] p-4 text-sm text-[color:var(--text-soft)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20"
                    placeholder="Paste or edit your prompt…"
                  />
                  <div className="flex gap-2 border-t border-[color:var(--border)] p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedPrompt(editPromptText);
                        setEditingPrompt(false);
                      }}
                      className="rounded-lg px-3 py-2 text-xs font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--surface-0)]"
                    >
                      Done editing
                    </button>
                    <button
                      type="button"
                      onClick={handleDeploy}
                      disabled={deploying}
                      className="rounded-lg bg-[color:var(--accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-95 disabled:opacity-50"
                    >
                      {deploying ? "Deploying…" : "Deploy to Agent"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input: only show when chat is active and no prompt yet (or after prompt we can allow follow-up) */}
            {messages.length > 0 && !showPromptOutput && (
              <div className="shrink-0 border-t border-[color:var(--border)] bg-[color:var(--surface-0)]/80 px-4 py-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your answer…"
                    disabled={loading}
                    className="min-w-0 flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text-soft)] placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="shrink-0 rounded-xl bg-[color:var(--accent)] p-3 text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            )}

            {success && (
              <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                {success}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
