import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/database";

export const runtime = "nodejs";

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_AGENT_ID = process.env.ULTRAVOX_AGENT_ID;
const ULTRAVOX_BASE = process.env.ULTRAVOX_API_BASE_URL ?? "https://api.ultravox.ai";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() || null : null;

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "prompt is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Save prompt into agent_prompts table
    const { error: insertError } = await supabase.from("agent_prompts").insert({
      user_id: userId || null,
      prompt,
    });

    if (insertError) {
      console.error("agent_prompts insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    // 2. Call Ultravox API to update the agent
    if (ULTRAVOX_API_KEY && ULTRAVOX_AGENT_ID) {
      const res = await fetch(`${ULTRAVOX_BASE}/api/agents/${ULTRAVOX_AGENT_ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ULTRAVOX_API_KEY,
        },
        body: JSON.stringify({
          name: "User Custom Agent",
          systemPrompt: prompt,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn("Ultravox agent update failed:", res.status, text);
        return NextResponse.json({
          ok: false,
          error: text || "Ultravox update failed",
          promptSaved: true,
        });
      }
    } else {
      console.warn("ULTRAVOX_API_KEY or ULTRAVOX_AGENT_ID not set; prompt saved but agent not updated");
    }

    return NextResponse.json({
      ok: true,
      message: "Agent deployed successfully",
      promptSaved: true,
    });
  } catch (e) {
    console.error("deploy-agent error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Server error",
      },
      { status: 500 }
    );
  }
}
