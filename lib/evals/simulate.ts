/**
 * Run a simulated conversation (text-level).
 * User steps are replayed; agent steps can be mocked or replaced with a real agent API later.
 */

import { getScenario } from "./scenarios";
import { runEvalOnCall } from "./run-eval";
import type { Scenario, TranscriptMessage } from "./types";

export interface SimulateOptions {
  scenarioId: string;
  /** Optional: if your agent exposes a text API, call it for each user message to get agent replies */
  agentReplyFn?: (messages: TranscriptMessage[]) => Promise<string>;
  persist?: boolean;
  agentId?: string | null;
  promptVersion?: string;
}

/**
 * Build a transcript from scenario steps.
 * For "user" steps we use the script; for "agent" steps we either use agentReplyFn or a placeholder.
 */
export async function runSimulation(options: SimulateOptions): Promise<{
  scenario: Scenario;
  transcript: TranscriptMessage[];
  evalResult: Awaited<ReturnType<typeof runEvalOnCall>>;
}> {
  const scenario = getScenario(options.scenarioId);
  if (!scenario) throw new Error(`Scenario not found: ${options.scenarioId}`);

  const transcript: TranscriptMessage[] = [];
  const messagesForAgent: TranscriptMessage[] = [];

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    if (step.role === "user") {
      transcript.push({ role: "user", text: step.text, ordinal: transcript.length });
      messagesForAgent.push(transcript[transcript.length - 1]);
    } else {
      let agentText: string;
      if (options.agentReplyFn && messagesForAgent.length > 0) {
        agentText = await options.agentReplyFn([...messagesForAgent]);
      } else {
        agentText = "[Simulated agent reply – connect agentReplyFn for real responses]";
      }
      transcript.push({ role: "agent", text: agentText, ordinal: transcript.length });
    }
  }

  const evalResult = await runEvalOnCall({
    transcript,
    scenarioId: scenario.id,
    agentId: options.agentId,
    promptVersion: options.promptVersion,
    scenarioDescription: scenario.description,
    expectedOutcomes: scenario.expected_outcomes,
    persist: options.persist,
  });

  return { scenario, transcript, evalResult };
}
