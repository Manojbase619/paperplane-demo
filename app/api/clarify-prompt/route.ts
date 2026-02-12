import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface ClarifyingQuestion {
  id: string;
  label: string;
  placeholder?: string;
}

/** Multi-turn: ask compliance and guardrail questions, then signal ready to generate */
const CHAT_SYSTEM = `You are a professional assistant helping define a voice agent with strong compliance and guardrails. You ask ONE short question at a time.

Priority: compliance and safety first. After the user's initial idea, you MUST ask about:
- Compliance: industry (e.g. finance, healthcare, collections), any regulatory or legal constraints, required disclosures or scripts the agent must say.
- Boundaries: what the agent must NEVER say or promise; handling of sensitive data; consent and recording notices if relevant.
- Guardrails: escalation rules, when to hand off to a human, response limits, or scripted disclaimers.

Ask only ONE question per message. Be concise and professional. No markdown or bullet lists.
After you have covered compliance and boundaries (at least 2–3 compliance-related answers) and enough context for a solid 50+ line prompt, respond with exactly: "I have enough details. Ready to generate your prompt?"`;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const messages = body?.messages;
  const userInput = body?.userInput;

  // Multi-turn chat: messages array
  if (Array.isArray(messages) && messages.length > 0) {
    const formatted = messages
      .filter((m: { role?: string; content?: string }) => m?.role && m?.content)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).trim(),
      }));
    if (formatted.length === 0) {
      return Response.json({ error: "messages required" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: CHAT_SYSTEM },
        ...formatted,
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    const readyToGenerate =
      /ready to generate your prompt/i.test(reply) || /have enough details/i.test(reply);

    return Response.json({ reply, readyToGenerate });
  }

  // Legacy: single userInput → return list of questions
  if (!userInput || typeof userInput !== "string") {
    return Response.json(
      { error: "userInput or messages is required" },
      { status: 400 }
    );
  }

  const trimmed = userInput.trim();
  if (!trimmed) {
    return Response.json(
      { error: "userInput cannot be empty" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are an expert at gathering requirements for voice agents.

Given the user's short idea for a voice agent, generate 3–5 clarifying questions that will help create a better, more specific prompt. Questions should be:
- Short and easy to answer (one or two sentences)
- Relevant to the idea (audience, tone, must-haves, boundaries)
- Not redundant with what the idea already states

Return ONLY a JSON array of objects with exactly these keys:
- "id": a short snake_case id (e.g. "primary_audience", "tone", "must_avoid")
- "label": the question text (clear, friendly)
- "placeholder": optional example answer in parentheses

Example format:
[{"id":"primary_audience","label":"Who is the primary audience?","placeholder":"e.g. home buyers, first-time"},{"id":"tone","label":"What tone should the agent use?","placeholder":"e.g. warm and professional"}]

No markdown, no code fence, only the JSON array.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `User's idea: ${trimmed}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;

  let questions: ClarifyingQuestion[];
  try {
    questions = JSON.parse(jsonStr) as ClarifyingQuestion[];
  } catch {
    questions = [];
  }

  if (!Array.isArray(questions)) {
    questions = [];
  }

  questions = questions
    .filter(
      (q) =>
        q &&
        typeof q.id === "string" &&
        typeof q.label === "string"
    )
    .slice(0, 5)
    .map((q) => ({
      id: String(q.id).replace(/\s/g, "_"),
      label: String(q.label),
      placeholder: typeof q.placeholder === "string" ? q.placeholder : undefined,
    }));

  return Response.json({ questions });
}
