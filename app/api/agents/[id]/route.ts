import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/database";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Not found" },
        { status: data ? 500 : 404 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Agent GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabase();

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.voice_id !== undefined) update.voice_id = body.voice_id;
    if (body.prompt !== undefined) update.prompt = body.prompt;
    if (body.greeting !== undefined) update.greeting = body.greeting;
    if (body.inactivity_config !== undefined)
      update.inactivity_config = body.inactivity_config;
    if (body.settings !== undefined) update.settings = body.settings;
    if (body.external_agent_id !== undefined)
      update.external_agent_id = body.external_agent_id;

    if (Object.keys(update).length === 0) {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return NextResponse.json(data ?? { error: "Not found" }, { status: data ? 200 : 404 });
    }

    const { data, error } = await supabase
      .from("agents")
      .update(update)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("Agent PATCH error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
