import { NextResponse } from "next/server";
import { getRecentCallsAdmin } from "@/lib/db-helpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50)
  );

  try {
    const calls = await getRecentCallsAdmin(limit);
    return NextResponse.json({ calls }, { status: 200 });
  } catch (e) {
    console.error("Admin calls error:", e);
    return NextResponse.json({ error: "Failed to load calls" }, { status: 500 });
  }
}
