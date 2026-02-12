import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/database";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Agents list error (table may not exist):", error.message);
      return NextResponse.json({
        agents: [
          {
            id: "default-1",
            external_agent_id: process.env.ULTRAVOX_AGENT_ID ?? null,
            name: "Default Agent",
            voice_id: "alloy",
            prompt: "You are a helpful voice AI agent. Be concise and natural.",
            greeting: "Hi, how can I help you today?",
            inactivity_config: {},
            settings: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });
    }

    if (!data?.length) {
      return NextResponse.json({
        agents: [
          {
            id: "default-1",
            external_agent_id: process.env.ULTRAVOX_AGENT_ID ?? null,
            name: "Default Agent",
            voice_id: "alloy",
            prompt: "You are a helpful voice AI agent. Be concise and natural.",
            greeting: "Hi, how can I help you today?",
            inactivity_config: {},
            settings: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });
    }

    return NextResponse.json({ agents: data });
  } catch (e) {
    console.error("Agents GET error:", e);
    return NextResponse.json(
      {
        agents: [
          {
            id: "default-1",
            external_agent_id: process.env.ULTRAVOX_AGENT_ID ?? null,
            name: "Default Agent",
            voice_id: "alloy",
            prompt: "You are a helpful voice AI agent. Be concise and natural.",
            greeting: "Hi, how can I help you today?",
            inactivity_config: {},
            settings: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body.name as string)?.trim() || "New Agent";
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        voice_id: (body.voice_id as string) ?? "alloy",
        prompt: (body.prompt as string) ?? null,
        greeting: (body.greeting as string) ?? null,
        inactivity_config: (body.inactivity_config as object) ?? {},
        settings: (body.settings as object) ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error("Agent create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("Agents POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
