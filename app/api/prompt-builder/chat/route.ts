/**
 * Conversational prompt builder: one chat endpoint.
 * AI asks questions one by one, extracts state internally, returns next question or full prompt.
 */
import OpenAI from "openai";
import { EMPTY_STATE, type PromptChatState } from "@/lib/prompt-chat-state";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const QUESTIONS_ORDER = [
  "What is the agent's role?",
  "What is the primary objective?",
  "Who is the target audience?",
  "What tone should it use?",
  "Any compliance restrictions?",
  "Any specific questions the agent must ask?",
  "How should it handle objections?",
  "How should it close conversations?",
] as const;

const SYSTEM_PROMPT = `You are a friendly prompt builder for a voice AI agent. You conduct a short interview to build a system prompt.

RULES:
- Ask ONE question at a time from this list, in order: ${QUESTIONS_ORDER.join(" → ")}
- Keep your messages concise (1–3 sentences).
- After the user answers, extract the relevant information into the state object. Use the exact state keys: role, objective, audience, tone, compliance, questions (array of strings), objectionHandling, closing.
- Confirm briefly what you extracted when it's not obvious.
- When you have at least: role, objective, audience, tone, AND at least two of (compliance, questions, objectionHandling, closing), stop asking and generate the full prompt.
- When generating, set action to "generate" and fill fullPrompt with the complete system prompt. Use this exact structure (plain text, no markdown):

ROLE:
... (2-4 lines)

OBJECTIVE:
... (2-4 lines)

PERSONALITY:
... (tone; 2-3 lines)

CONVERSATION FLOW:
... (greeting, main dialogue, closing; 4-6 lines)

QUESTIONS TO ASK:
... (bullet or numbered list)

RULES:
... (compliance, boundaries, response length)

SILENCE HANDLING:
... (what to say if user is silent)

ERROR HANDLING:
... (unclear input, off-topic)

- If the user's first message is just starting the conversation, ask the first question: "What is the agent's role?"
- Never show or mention template variables like {{agent_role}}. Only natural language.

You MUST respond with valid JSON only, no other text. Format:
{"message":"your reply to the user","state":{...},"action":"ask"|"generate","fullPrompt":null or "ROLE:\\n..."}
`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const state: PromptChatState = body.state && typeof body.state === "object"
      ? { ...EMPTY_STATE, ...body.state }
      : EMPTY_STATE;

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_GENERATE_PROMPT_MODEL || "gpt-4o-mini";

    const conversation: ChatMessage[] =
      messages.length === 0
        ? [{ role: "user", content: "I want to generate a prompt for my voice agent." }]
        : messages;

    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: openaiMessages,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let parsed: {
      message?: string;
      state?: Partial<PromptChatState>;
      action?: string;
      fullPrompt?: string | null;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "Invalid model response", raw: raw.slice(0, 200) },
        { status: 502 }
      );
    }

    const mergedState: PromptChatState = {
      ...EMPTY_STATE,
      ...state,
      ...parsed.state,
      questions: Array.isArray(parsed.state?.questions)
        ? parsed.state.questions
        : state.questions,
    };

    const action = parsed.action === "generate" ? "generate" : "ask";
    const fullPrompt =
      action === "generate" && typeof parsed.fullPrompt === "string"
        ? parsed.fullPrompt.trim()
        : undefined;

    return Response.json({
      message: typeof parsed.message === "string" ? parsed.message : "What is the agent's role?",
      state: mergedState,
      action,
      fullPrompt: fullPrompt ?? null,
    });
  } catch (e) {
    console.error("Prompt builder chat error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 }
    );
  }
}
