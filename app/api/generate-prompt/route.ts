export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import OpenAI from "openai"

export async function POST(req: Request) {

 try {

  const body = await req.json()
  const useCase = body.use_case

  if (!useCase) {
   return Response.json({ error: "Missing use_case" })
  }

  // 🔐 OpenAI only created at runtime
  const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY!
  })

  const completion = await openai.chat.completions.create({
   model: "gpt-4o-mini",
   messages: [
    { role: "system", content: "Classify capability from use case." },
    { role: "user", content: useCase }
   ]
  })

  return Response.json({
   result: completion.choices[0]?.message?.content ?? ""
  })

 } catch {

  return Response.json({
   error: "Prompt generation failed"
  })

 }
}
