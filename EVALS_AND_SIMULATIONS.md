# Evals & Simulations Strategy — Beyond Typical Company Practice

This document describes how to run **evaluations (evals)** and **simulations** for Basethesis at a level that exceeds what most companies do: automated, continuous, multi-dimensional, and wired into deployment and product decisions.

---

## 1. Why Most Companies Fall Short

- **One-off evals**: Manual QA or a single benchmark run; no regression tracking.
- **No simulation**: Testing only in production or with a few internal test calls.
- **Single metric**: e.g. “did the call complete?” with no quality or safety dimensions.
- **No gates**: Deployments happen without checking agent quality.
- **No flywheel**: Real conversations aren’t used to improve test scenarios or eval criteria.

---

## 2. Target State: What “Greater Extent” Means

| Dimension | Typical company | This project (target) |
|----------|------------------|------------------------|
| **Frequency** | Ad hoc or quarterly | Every call evaluated; simulations on every PR or nightly |
| **Scope** | One agent, one flow | All agents, all prompt versions, scenario bank (100+ cases) |
| **Metrics** | Completion / satisfaction | Correctness, safety, prompt adherence, latency, consistency, coverage |
| **Simulations** | None or manual calls | Automated synthetic callers, scenario bank, edge/adversarial cases |
| **Gates** | None | Block deploy if eval/sim scores drop below threshold |
| **Data flywheel** | No | Anonymized real transcripts → new scenarios; failures → regression suite |
| **Visibility** | Spreadsheets / one-off dashboards | Time-series dashboards, per-agent, per-scenario, trend alerts |

---

## 3. Evals: What to Evaluate

### 3.1 Per-call (post-hoc) evals

Run after each call (or in batches) on stored transcripts:

- **Correctness**  
  Did the agent give factually correct, relevant answers? (LLM-as-judge or rule-based where possible.)
- **Prompt adherence**  
  Did the agent follow system prompt (persona, tone, instructions)?
- **Safety & policy**  
  No PII leakage, no harmful or off-brand content, appropriate refusals.
- **Task completion**  
  For booking/support: did the agent collect required info and complete the intended task?
- **User experience (proxy)**  
  Turn count, repetition, long monologues, appropriate brevity for voice.
- **Consistency**  
  Same scenario → similar behavior across runs (variance metrics).

Store scores in `eval_results` keyed by `call_id` and `eval_run_id` so you can trend over time and slice by agent, prompt version, or time.

### 3.2 Regression evals (golden set)

- Maintain a **golden set** of transcripts (anonymized, high-quality conversations).
- On every prompt/agent change, re-run the same evals on this set.
- **Gate**: Fail the change (or block deploy) if any golden-set score drops beyond a threshold.
- Add new golden cases when you find production failures or edge cases.

### 3.3 LLM-as-judge

- Use a **judge model** (e.g. Claude) with a fixed rubric to score a transcript on the dimensions above.
- Provide: system prompt (or summary), transcript, and optional expected outcomes.
- Output: structured scores (e.g. 1–5) and short justification.
- Keep judge prompts versioned so evals are reproducible.

---

## 4. Simulations: What to Simulate

### 4.1 Scenario bank

Define many **scenarios** (user intents + expected behavior):

- **Happy path**: “Book a trip to Paris, March 15–20, 2 travelers, budget $15k.”
- **Edge cases**:  
  - Unclear dates, multiple destinations, change of mind mid-call.  
  - Interruptions, “wait”, “actually I meant…”.  
  - Short answers, long rambles, silence handling.
- **Adversarial / safety**:  
  - Off-topic, inappropriate requests, PII probing.  
  - Non-English or mixed language (if you support it).
- **Context / memory**:  
  - “Continue from last time”, “same as before”, reference to prior call.

Each scenario has:

- `scenario_id`, name, category.
- **User script** (or LLM-generated user messages).
- **Expected agent behavior** (e.g. “must ask for dates”, “must not confirm price without dates”) for automated checks.
- Optional **golden transcript** for regression.

### 4.2 Synthetic caller

- **Option A**: Use Ultravox (or provider) test/sandbox API to run real voice calls with a scripted “user” (TTS or pre-recorded utterances).
- **Option B**: **Text-level simulation**: replay user messages through your agent API (if you have a text endpoint) and compare agent replies to expectations.
- **Option C**: **Hybrid**: Use stored transcripts as “user” side and re-run only the agent side with a new prompt (replay evals).

Run the scenario bank (or a subset) on schedule (e.g. nightly) or on every PR; fail if pass rate or score drops.

### 4.3 Data flywheel

- **Real → scenarios**: When a call fails or is flagged, anonymize and add a scenario (e.g. “user said X, agent did Y; expected Z”).
- **Real → golden set**: Periodically add high-quality, anonymized transcripts to the golden set and re-baseline scores.
- **Simulations → evals**: Every simulation run produces a transcript; run the same evals on it and store results.

---

## 5. Implementation Layout (This Repo)

```
lib/evals/
  types.ts       # EvalRun, Scenario, EvalResult, MetricScore
  scenarios.ts   # Scenario bank (happy path, edge, adversarial)
  judge.ts       # LLM-as-judge for transcript scoring
  run-eval.ts    # Run evals on a transcript (by call_id or in-memory)
  simulate.ts    # Run simulated conversation (text or wire to Ultravox test)
  storage.ts     # Save/load eval runs and results (Supabase)

app/api/evals/
  run/route.ts       # POST { callId } or { transcript } → run evals, return scores
  results/route.ts  # GET ?callId= & runId= & agentId=
  simulate/route.ts  # POST { scenarioId } or { scenario } → run sim, return transcript + scores

migrations/
  005_evals.sql      # eval_runs, eval_results, scenarios (optional)

scripts/
  evals-run.mjs      # CLI: run evals on last N calls or on golden set
  evals-simulate.mjs # CLI: run scenario bank or single scenario
```

---

## 6. Operational Practices

- **Ownership**: Assign an “evals owner” (or rotation) to maintain scenario bank and golden set.
- **Review**: Weekly review of failing scenarios and low-scoring calls; decide whether to fix prompt, add scenario, or change product.
- **CI**: Run a small scenario subset (e.g. 10 critical paths) on every PR that touches prompts or agent config; block merge if any critical scenario fails.
- **Alerts**: If production eval scores (e.g. rolling 7-day) drop, alert and investigate.
- **Versioning**: Tag prompt and agent config with a version; every eval run stores `prompt_version` / `agent_version` so you can compare before/after.

---

## 7. Success Criteria

- **Coverage**: Every production call has at least one eval run (correctness, safety, adherence).
- **Regression**: Golden set + scenario bank run on every deploy (or nightly); gate on pass rate.
- **Visibility**: Dashboard with scores over time, per agent, per scenario, and trend alerts.
- **Flywheel**: At least 2 new scenarios or golden cases added per month from production or support feedback.

This gives you evals and simulations at a **greater extent** than most companies: continuous, multi-dimensional, automated, and tied to both deployment and product improvement.

---

## 8. Implementation quick start (this repo)

### Prerequisites

- Apply `migrations/005_evals.sql` in Supabase (creates `eval_runs`, `eval_results`).
- Set `ANTHROPIC_API_KEY` in `.env.local` for LLM-as-judge.

### API

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `/api/evals/run` | POST | `{ callId? }` or `{ transcript: [{ role, text }] }`, optional `scenarioId`, `persist`, `systemPromptSummary` | Run evals on a call or in-memory transcript; returns scores and pass/fail. |
| `/api/evals/results` | GET | Query: `callId`, `evalRunId`, `agentId`, `limit` | List stored eval results. |
| `/api/evals/simulate` | GET | — | List scenario IDs and metadata. |
| `/api/evals/simulate` | POST | `{ scenarioId, persist?, agentId?, promptVersion? }` | Run one scenario (synthetic transcript + eval); returns transcript and eval result. |

### Scripts (dev server must be running)

```bash
# List scenarios
npm run evals:scenarios

# Run simulation for a scenario (default: happy_booking_paris)
npm run evals:simulate
npm run evals:simulate -- --scenarioId=edge_interruption --persist

# Run evals on a call (replace CALL_ID with a real call_id from Supabase)
npm run evals:run -- --callId=CALL_ID --persist
```

### Adding scenarios

Edit `lib/evals/scenarios.ts`: add entries to the `SCENARIOS` array. Use production edge cases (anonymized) to grow the bank (data flywheel).
