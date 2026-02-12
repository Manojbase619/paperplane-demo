/**
 * Generate final 50+ line prompt from structured stage answers (blueprint).
 */
import OpenAI from "openai";
import { buildBlueprintFromAnswers } from "@/lib/prompt-builder-stages";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MIN_LINES = 50;

const SYSTEM_PROMPT = `You are an expert prompt engineer for voice AI agents. Your output will be used directly as the system prompt for a voice agent on live calls.

CRITICAL: Your response MUST be at least ${MIN_LINES} lines long. Write in plain text. Use the exact section labels below (ALL CAPS). No markdown, no code blocks, no JSON.

Use the user's blueprint (agent identity, compliance, operational rules, conversation architecture) to fill every section with specific, actionable instructions. Respect all compliance and boundary answers.

Sections (write all of these, in this order):

ROLE:
- The agent's purpose and scope from the blueprint.
- What domain or use case it handles.
- What it is NOT responsible for.

PERSONALITY:
- Tone (from blueprint; respect tone restrictions).
- How the agent should sound.

CONVERSATION FLOW:
- Step 1: Greeting – what to say and when.
- Step 2: Qualification or context – identity verification if required.
- Step 3: Main dialogue – structured flow, objection handling if required.
- Step 4: Closing – confirm data and/or summarize if required, then close.

QUESTIONS TO ASK:
- List key questions the agent must ask, in order.
- Include follow-ups. Rephrase guidance if needed.

RULES:
- All compliance boundaries from the blueprint (disclosures, legal language, what agent must never do).
- Operational rules (escalation, resistance limits, harassment limitations).
- Response length (e.g. keep replies under 2–3 sentences unless explaining).

SILENCE HANDLING:
- What to say if the user is silent.
- What to say after repeated silence.

ERROR HANDLING:
- Unclear input, off-topic, or requests the agent cannot fulfill.

Write at least ${MIN_LINES} lines. More detail is better.`;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const answers = body?.answers ?? {};
    const blueprint = buildBlueprintFromAnswers(answers);

    if (!blueprint.trim()) {
      return new Response(
        JSON.stringify({ error: "No blueprint: complete at least Stage 1–4." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userContext = `Structured blueprint from the agent builder:\n\n${blueprint}`;

    const model = process.env.OPENAI_GENERATE_PROMPT_MODEL || "gpt-4o";
    const stream = await openai.chat.completions.create({
      model,
      stream: true,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContext },
      ],
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) controller.enqueue(encoder.encode(content));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (e) {
    console.error("Prompt builder generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Generation failed" }),
      { status: 500,
        headers: { "Content-Type": "application/json" } }
    );
  }
}
