/**
 * Stub for evals: satisfies build; no DB or external deps.
 * Callers (e.g. POST /api/evals/run) get null until evals are wired to real storage.
 */

export function runEvalOnCall(_opts?: unknown): Promise<null> {
  return Promise.resolve(null);
}
