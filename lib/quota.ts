import { getStore, type DailyUsage } from "@/lib/store";

export const MAX_CALLS_PER_DAY = 3;
export const MAX_SECONDS_PER_DAY = 30 * 60;

/* =======================
   TYPES
======================= */

export type QuotaResult =
  | {
      allowed: true;
      usage: DailyUsage;
      remainingCalls: number;
      remainingSeconds: number;
    }
  | {
      allowed: false;
      usage: DailyUsage;
      remainingCalls: 0;
      remainingSeconds: number;
      reason: "call_count";
      message: string;
    }
  | {
      allowed: false;
      usage: DailyUsage;
      remainingCalls: number;
      remainingSeconds: 0;
      reason: "duration";
      message: string;
    };

/* =======================
   HELPERS
======================= */

export function getDateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/* =======================
   QUOTA LOGIC
======================= */

export async function checkAndReserveQuota(
  rawPhone: string,
  now: Date = new Date()
): Promise<QuotaResult> {
  const store = getStore();
  const phone = normalizePhone(rawPhone);
  const usage_date = getDateKey(now);

  const existing =
    (await store.getDailyUsage(phone, usage_date)) ??
    ({
      phone,
      usage_date,
      callsCount: 0,
      totalDurationSeconds: 0,
    } satisfies DailyUsage);

  const remainingCalls = Math.max(
    0,
    MAX_CALLS_PER_DAY - existing.callsCount
  );

  const remainingSeconds = Math.max(
    0,
    MAX_SECONDS_PER_DAY - existing.totalDurationSeconds
  );

  if (remainingCalls <= 0) {
    return {
      allowed: false,
      usage: existing,
      remainingCalls: 0,
      remainingSeconds,
      reason: "call_count",
      message: "Daily call limit reached. Try again tomorrow.",
    };
  }

  if (remainingSeconds <= 0) {
    return {
      allowed: false,
      usage: existing,
      remainingCalls,
      remainingSeconds: 0,
      reason: "duration",
      message: "Daily time limit reached. Try again tomorrow.",
    };
  }

  const usage = await store.incrementDailyUsage(
    phone,
    usage_date,
    1,
    0
  );

  return {
    allowed: true,
    usage,
    remainingCalls: Math.max(
      0,
      MAX_CALLS_PER_DAY - usage.callsCount
    ),
    remainingSeconds: Math.max(
      0,
      MAX_SECONDS_PER_DAY - usage.totalDurationSeconds
    ),
  };
}
