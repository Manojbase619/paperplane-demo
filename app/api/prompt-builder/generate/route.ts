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

  const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY!
  })

  const completion = await openai.chat.completions.create({
   model: "gpt-4o-mini",
   temperature: 0,
   messages: [
    { role: "system", content: "Extract capability JSON." },
    { role: "user", content: useCase }
   ]
  })

  return Response.json({
   result: completion.choices[0]?.message?.content ?? ""
  })

 } catch {
  return Response.json({ error: "Prompt generation failed" })
 }
}
