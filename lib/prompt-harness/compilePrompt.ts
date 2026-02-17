/**
 * Combines selected topology blocks into a final system prompt.
 * Stateless.
 */

const PREFIX = "You are a voice logistics dispatch agent.";
const SUFFIX = "Maintain deterministic capture before execution.";

/**
 * Compile selected block contents into a single system prompt string.
 */
export function compilePrompt(selectedBlocks: string[]): string {
  const parts: string[] = [PREFIX];

  for (const block of selectedBlocks) {
    if (block.trim()) parts.push(block.trim());
  }

  parts.push(SUFFIX);
  return parts.join("\n\n").trim();
}
