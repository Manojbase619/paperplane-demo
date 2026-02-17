export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import OpenAI from "openai"

const client = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY!
})

type ClarifyingQuestion = {
 question: string
}

export async function POST(req: Request) {

 try {

  const body = await req.json()
  const trimmed = (body.idea || "").toString().trim()

  if (!trimmed) {
   return Response.json({ questions: [] })
  }

  const systemPrompt =
   "You generate up to 5 concise clarifying questions about a user's idea. Respond ONLY as a JSON array like [{\"question\":\"...\"}]."

  const completion = await client.chat.completions.create({
   model: "gpt-4o-mini",
   temperature: 0.3,
   messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: "User idea: " + trimmed }
   ]
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? "[]"

  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  const jsonStr = jsonMatch ? jsonMatch[0] : "[]"

  let questions: ClarifyingQuestion[] = []

  try {
   questions = JSON.parse(jsonStr)
  } catch {
   questions = []
  }

  questions = questions.slice(0, 5)

  return Response.json({ questions })

 } catch {

  return Response.json({ questions: [] })

 }
}
