export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import OpenAI from "openai"

export async function POST(req: Request) {

 try {

  const body = await req.json()
  const message = body.message

  if (!message) {
   return Response.json({ error: "Missing message" })
  }

  const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY!
  })

  const completion = await openai.chat.completions.create({
   model: "gpt-4o-mini",
   messages: [
    { role: "user", content: message }
   ]
  })

  return Response.json({
   reply: completion.choices[0]?.message?.content ?? ""
  })

 } catch {
  return Response.json({ error: "Chat failed" })
 }
}
