import { NextResponse } from "next/server";

import { getAdminStatsForDate, normalizeAdminPhone } from "@/lib/analytics";

const ADMIN_PHONES = ["9655071573", "9886975211"];

export async function GET(req: Request) {
  const rawAdmin =
    req.headers.get("x-admin-phone") ??
    new URL(req.url).searchParams.get("phone") ??
    "";
  const adminPhone = normalizeAdminPhone(rawAdmin);

  if (!ADMIN_PHONES.includes(adminPhone)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getAdminStatsForDate();
  return NextResponse.json(stats, { status: 200 });
}

