import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/** Minimum number of lines the generated prompt must have. */
const MIN_LINES = 50;

const SYSTEM_PROMPT = `You are an expert prompt engineer for voice AI agents. Your output will be used directly as the system prompt for a voice agent: the agent reads this prompt and behaves accordingly on live calls.

CRITICAL: Your response MUST be at least ${MIN_LINES} lines long. Write in plain text. Use the exact section labels below (ALL CAPS). No markdown, no code blocks, no JSON.

Include EVERY section below. For each section, write 5–12 lines of specific, actionable instructions so the total length is at least ${MIN_LINES} lines.

Sections (write all of these, in this order):

ROLE:
- The agent's purpose and scope.
- What domain or use case it handles.
- What it is NOT responsible for.

PERSONALITY:
- Tone (e.g. warm, professional, firm, empathetic).
- How the agent should sound (pace, formality).
- How to address the user.

CONVERSATION FLOW:
- Step 1: Greeting – exactly what to say and when.
- Step 2: Qualification or context – how to confirm identity or context.
- Step 3: Main dialogue – how to gather information or accomplish the goal.
- Step 4: Closing – how to wrap up and what to say last.

QUESTIONS TO ASK:
- List every key question the agent must ask, in order.
- Include follow-up questions for each topic.
- Include how to rephrase if the user doesn't understand.

RULES:
- What the agent must never do or say.
- Safety and compliance boundaries.
- Response length (e.g. keep replies under 2–3 sentences unless explaining).

SILENCE HANDLING:
- What to say if the user is silent for a few seconds.
- What to say after repeated silence.
- When to offer to repeat or rephrase.

ERROR HANDLING:
- What to do when the user's input is unclear.
- What to do when the user goes off-topic.
- What to say when the agent cannot fulfill a request.

End with a short EMPLOYMENT section if relevant (e.g. "Stay in role. Do not break character.").

Write at least ${MIN_LINES} lines. More detail is better; the agent will use this entire prompt.`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userInput = body?.userInput ?? "";
  const clarification = body?.clarification;
  const conversation = body?.conversation;

  const userContext =
    conversation && typeof conversation === "string" && conversation.trim()
      ? `Use this full conversation to build the agent prompt. Extract the user's goal, audience, tone, and any rules they mentioned.\n\nConversation:\n${conversation.trim()}`
      : clarification && typeof clarification === "string" && clarification.trim()
        ? `User's idea: ${userInput}\n\nAdditional context:\n${clarification.trim()}`
        : `User's idea: ${userInput}`;

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
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
