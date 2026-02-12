# Basethesis Voice — Product & Technical Report

**Document type:** Investor-ready product and systems update  
**Product:** Basethesis Voice — end-to-end AI voice platform  
**Date:** February 2026

---

## Executive Summary

Basethesis Voice is an end-to-end AI voice platform that connects prompt design, agent deployment, live execution, and continuous evaluation in a single pipeline. The system is built for production use with clear automation flows, evaluation safeguards, a defined memory strategy, and a path to AWS-based scaling post-approval.

---

## 1. Architecture Overview

- **Stack:** Next.js application layer, Supabase (PostgreSQL) for persistence, Ultravox as the voice execution provider, OpenAI for prompt generation, Anthropic for summarization and LLM-as-judge evals.
- **Boundaries:** The app owns user identity, call lifecycle, context assembly, and post-call processing; Ultravox owns real-time voice, STT/TTS, and agent runtime. Configuration is pushed to Ultravox via API; no direct control of voice runtime logic inside the provider.
- **Data flow:** User → app (auth/phone) → call creation API → context resolution → Ultravox API (create call with context) → live call → webhooks (call.ended) → transcript fetch, storage, summaries, optional evals.

---

## 2. Pipeline: Prompt → Agent → Ultravox → Live Execution

**2.1 Prompt generation (agent creation engine)**  
- **Endpoint:** `/api/generate-prompt`. User input (e.g. “travel booking agent”) is sent to OpenAI (GPT-4o-mini) with a fixed system prompt that enforces a structured output: ROLE, PERSONALITY, CONVERSATION FLOW, QUESTIONS TO ASK, RULES, SILENCE HANDLING, ERROR HANDLING. Output is long-form plain text (target 40–50 lines), streamed to the client. No JSON; designed for direct use as a voice agent system prompt.

**2.2 Agent deployment**  
- **Deploy pipeline:** `/api/deploy-agent` accepts a prompt and optional `userId`. It (1) persists the prompt in `agent_prompts` (Supabase), (2) calls Ultravox `PATCH /api/agents/{agentId}` with `systemPrompt` to push the same prompt to the live agent. Success means the prompt is both versioned in our DB and active in Ultravox.  
- **Direct sync:** `/api/ultravox/update-agent` allows updating a specific Ultravox agent by `agentId` with a prompt only (no DB write). Used for console-driven prompt edits and keeping a given agent in sync with a chosen prompt version.

**2.3 Call creation and context injection**  
- **Endpoint:** `/api/calls/create`. Validates phone, finds or creates user, loads last call and any stored summary, then selects a **three-tier memory strategy** before calling Ultravox `POST /api/agents/{agentId}/calls`:  
  - **Tier 1 (< 1 hr since last call):** Uses Ultravox `priorCallId` to continue the same conversation; no transcript injection.  
  - **Tier 2 (1–24 hrs):** Injects full transcript as `initialMessages` plus a short “Welcome back” agent line.  
  - **Tier 3 (> 24 hrs):** Injects summary-derived `templateContext` (e.g. customerName, previousDestination, bookingProgress) and a synthetic context message.  
- Call record is written to `calls`; a `call_sessions` row is created for usage and quota. Response returns `callId`, `joinUrl`, and context type for the client.

**2.4 Live execution**  
- Ultravox runs the call; client joins via `joinUrl`. Real-time transcript can be consumed via WebSocket (e.g. `UltravoxClient` / `useUltravoxTranscript`). No application logic runs in the voice path; the app’s role ends at creating the call with the right prompt and context.

**2.5 Post-call automation**  
- **Webhook:** `POST /api/webhooks/ultravox` handles `call.started` (log only) and `call.ended`. On end: update `calls` status, end `call_sessions`, increment `daily_usage`, fetch transcript from Ultravox `GET /api/calls/{callId}/messages`, store messages in `call_messages`, then trigger **async** summary generation (booking progress, user preferences, conversation summary) and persist to `call_summaries`. Responses are kept fast; summary generation is non-blocking. This delivers **live transcription** (post-call) and **structured conversation data** (messages + summaries) for analytics, evals, and future memory.

---

## 3. Evaluation Framework & Safeguards

- **Storage:** Evals use `eval_runs` and `eval_results` (migrations 005); results are keyed by `call_id`, `eval_run_id`, optional `scenario_id`, `agent_id`, `prompt_version` for trend and regression analysis.
- **Metrics:** Correctness, prompt adherence, safety, task completion, UX proxy (turn count, repetition, brevity), and consistency. Scores are 1–5; LLM-as-judge (Claude) produces structured JSON with per-metric reasoning and an overall pass/fail (e.g. pass if overall ≥ 3.5 and no metric = 1).
- **APIs:** `/api/evals/run` runs evals on a `callId` or in-memory `transcript`; optional `scenarioId`, `systemPromptSummary`, `expectedOutcomes` support scenario-based and golden-set runs. `/api/evals/simulate` runs scenario-based simulations (synthetic conversations) and returns transcript + eval result. `/api/evals/results` supports querying by call, run, or agent.
- **Scenario bank:** Scenarios (happy path, edge, adversarial, memory, safety) define user scripts and expected agent behavior; used for regression and pre-deploy gates. Strategy doc (EVALS_AND_SIMULATIONS.md) targets: per-call evals, golden-set regression, CI gates on critical scenarios, and a data flywheel (production failures → new scenarios).
- **Automation:** Scripts `evals-run.mjs`, `evals-simulate.mjs`, `evals-scenarios.mjs` allow CLI runs (e.g. evals on last N calls or a scenario, with `--persist`). Design supports nightly/PR-triggered runs and deploy gates when scores drop below threshold.

---

## 4. Memory Architecture Direction (R&D)

- **Current:** Three-tier context at call creation (priorCallId, full transcript, summary + templateContext); post-call summaries (booking progress, user preferences, conversation summary) stored in `call_summaries` and used in Tier 3. No runtime memory inside the voice provider beyond what we inject at call start.
- **Direction:** Context retention across sessions is already partially in place (Tier 2/3). R&D focus: richer **multi-turn and cross-session memory** (e.g. compressed history, explicit “memory” store), **personalization** (preferences, history-aware prompts), and tighter integration with the eval framework (e.g. memory-specific scenarios). No commitment to a specific memory product yet; architecture is built to plug in additional storage and injection logic without changing the core Prompt → Agent → Ultravox → Webhook flow.

---

## 5. Reliability & Operational Design

- **Idempotency and errors:** Call creation validates input and returns structured error codes (e.g. PHONE_REQUIRED, ULTRAVOX_API_ERROR). Webhook always returns 200 to avoid Ultravox retries; failures are logged; transcript fetch and summary generation failures do not block webhook acknowledgment.
- **Quotas:** Daily call count and duration limits enforced in call creation path; usage stored in `daily_usage` and updated on `call.ended`.
- **Observability:** Logging at each pipeline step (call creation, tier selection, webhook events, message count, summary success/failure). No custom APM in repo; design is compatible with standard logging/monitoring (e.g. Vercel logs, future Sentry/DataDog).
- **Secrets:** All provider keys (Supabase, Ultravox, OpenAI, Anthropic) via environment variables; webhook signature verification is documented and optional (commented) for production.

---

## 6. Scalability & Infrastructure Readiness

- **Current:** Stateless Next.js API routes; Supabase as single DB; external APIs (Ultravox, OpenAI, Anthropic) are the main latency and rate-limit factors. Deployment guide targets Vercel; call creation and webhook are built to complete within typical serverless time limits.
- **AWS production scaling (post-approval):** Plan is to move to AWS for production-grade control: compute (e.g. ECS/Lambda), managed RDS or Aurora for PostgreSQL, S3 for artifacts if needed, and optional queue (SQS) for webhook processing or batch evals to decouple from request timeout. Same application logic (prompt → deploy → call create → webhook → storage → summaries/evals) can be retained; only hosting, DB, and optional queue/workers would change. No implementation in repo yet; architecture is deployment-agnostic.

---

## 7. Deployment Roadmap

- **Today:** Run on Vercel with Supabase; Ultravox webhook and env-based agent ID/API key; migrations 001–006 applied for users, calls, messages, summaries, admin/console tables, evals, agent_prompts.
- **Next:** Harden webhook verification, add deploy gates (evals/simulations on critical scenarios), and expand scenario bank from production feedback. Optional: Sentry and performance monitoring.
- **Post-approval:** AWS rollout (as above), telephony integration (e.g. PSTN/SIP into website), and continued memory R&D (context retention, personalization). Automated post-call greeting (e.g. SMS or email with summary) is a natural extension of the existing post-call pipeline (transcript + summaries already available).

---

## 8. Product Maturity Summary

| Area                    | Status |
|-------------------------|--------|
| Prompt → Agent → Ultravox pipeline | Implemented and wired (generate-prompt, deploy-agent, update-agent, calls/create). |
| Live execution          | Delegated to Ultravox; joinUrl and optional real-time transcript in client. |
| Post-call data          | Transcript and structured summaries stored; delivery mechanism (API/export) in place. |
| Evaluation              | Evals and simulations implemented (APIs, judge, scenarios, storage); gates and CI integration documented. |
| Memory                  | Three-tier injection and summaries in production path; multi-turn/personalization under R&D. |
| Deployment              | Vercel + Supabase ready; AWS path defined, not yet implemented. |
| Telephony / post-call messaging | Not implemented; roadmap items. |

---

## 9. Conclusion

Basethesis Voice delivers a closed-loop flow from prompt design and deployment to live voice execution and post-call analysis, with evaluation and memory infrastructure in place to support quality gates and ongoing optimization. The system is structured for scalability and reliability, with a clear path to AWS and future telephony and messaging features. This report reflects the current implementation and stated direction; no forward-looking statements beyond the described roadmap.
