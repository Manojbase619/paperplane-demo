import { NextResponse } from "next/server";

import { getSessionsForExport, normalizeAdminPhone } from "@/lib/analytics";

const ADMIN_PHONES = ["9655071573", "9886975211"];

function toCsvValue(value: unknown): string {
  const s =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : String(value);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const rawAdmin =
    req.headers.get("x-admin-phone") ?? searchParams.get("phone") ?? "";
  const adminPhone = normalizeAdminPhone(rawAdmin);

  if (!ADMIN_PHONES.includes(adminPhone)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = searchParams.get("scope") ?? "today";

  let from: Date | undefined;
  let to: Date | undefined;

  if (scope === "today") {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    from = start;
    to = end;
  } else if (scope === "range") {
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    if (fromStr) from = new Date(fromStr);
    if (toStr) to = new Date(toStr);
  } else {
    from = undefined;
    to = undefined;
  }

  const sessions = await getSessionsForExport({ from, to });

  const header = [
    "phone",
    "start_time",
    "end_time",
    "duration_seconds",
    "end_reason",
    "date",
  ];

  const rows = sessions.map((s) => [
    s.phone,
    s.startTime,
    s.endTime ?? "",
    s.durationSeconds,
    s.endReason ?? "",
    s.date,
  ]);

  const csv =
    [header, ...rows]
      .map((row) => row.map((v) => toCsvValue(v)).join(","))
      .join("\n") + "\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paperplane-export-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

