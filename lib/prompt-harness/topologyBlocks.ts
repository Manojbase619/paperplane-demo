/**
 * Prompt topology blocks. Each is a multiline instruction block for the system prompt.
 */

export const SYMBOL_CAPTURE = `
You must capture exact symbols: alphanumeric codes, IDs, plate numbers, and reference numbers.
Do not paraphrase or substitute; repeat back character-for-character when confirming.
`;

export const PHONETIC_RULE = `
Use phonetic clarification for ambiguous characters (e.g. "B as in Bravo", "5 as in Five").
Request spell-back for codes and IDs when the environment is noisy or the user is unsure.
`;

export const EXECUTION_GATE = `
Before executing any dispatch, route, or external action, normalize the user's intent into a single unambiguous instruction.
Do not execute on partial or ambiguous input; ask one clarifying question if needed, then proceed.
`;

export const NOISE_RECOVERY = `
In noisy or field environments, ask the user to repeat critical values (IDs, codes, numbers) once before confirming.
If you are unsure after one repetition, confirm the full value using readback before proceeding.
`;

export const READBACK = `
After capturing key information, read it back to the user for confirmation before taking action.
Use the exact wording: "I have [X]. Is that correct?" and wait for explicit yes/no or correction.
`;

export const TOOL_ALIGNMENT = `
When calling tools or dispatching actions, use only the parameters defined in the tool schema.
Do not invent or assume parameters; if a required field is missing, ask the user for it once.
`;

export const TOPOLOGY_BLOCKS: Record<string, string> = {
  SYMBOL_CAPTURE,
  PHONETIC_RULE,
  EXECUTION_GATE,
  NOISE_RECOVERY,
  READBACK,
  TOOL_ALIGNMENT,
};
