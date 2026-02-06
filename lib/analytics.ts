import { getDateKey, normalizePhone } from "@/lib/quota";
import {
  getStore,
  type ActiveCall,
  type CallSession,
  type DailyUsage,
} from "@/lib/store";

export type DailyUsageSummary = DailyUsage & {
  remainingCalls: number;
  remainingSeconds: number;
};

export type AdminStats = {
  date: string;
  usage: DailyUsageSummary[];
  activeCalls: ActiveCall[];
};

export async function getAdminStatsForDate(
  date: Date = new Date()
): Promise<AdminStats> {
  const key = getDateKey(date);
  const store = getStore();

  const [usage, activeCalls] = await Promise.all([
    store.listDailyUsage(key),
    store.getActiveCalls(date),
  ]);

  return {
    date: key,
    usage: usage.map((u) => ({
      ...u,
      remainingCalls: Math.max(0, 3 - u.callsCount),
      remainingSeconds: Math.max(0, 30 * 60 - u.totalDurationSeconds),
    })),
    activeCalls,
  };
}

export async function getSessionsForExport(input: {
  from?: Date;
  to?: Date;
}): Promise<CallSession[]> {
  const store = getStore();
  return store.getCallSessionsForExport(input);
}

export function normalizeAdminPhone(adminPhone: string): string {
  return normalizePhone(adminPhone);
}

