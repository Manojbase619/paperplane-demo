import { NextResponse } from "next/server";

import { getAdminStatsForDate } from "@/lib/analytics";

export async function GET() {
  try {
    const stats = await getAdminStatsForDate();
    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    // Missing tables (e.g. call_sessions, daily_usage) → return empty stats so the dashboard still loads
    console.warn("Admin stats error (missing tables?):", err);
    const key = new Date().toISOString().slice(0, 10);
    return NextResponse.json(
      { date: key, usage: [], activeCalls: [] },
      { status: 200 }
    );
  }
}

