import { getSupabase } from "@/lib/database";

/* =======================
   TYPES
======================= */

export type CallEndReason =
  | "user_end"
  | "time_limit"
  | "quota_limit"
  | "system";

export type CallSession = {
  id: string;
  phone: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  endReason: CallEndReason | null;
  usage_date: string;
};

export type DailyUsage = {
  phone: string;
  usage_date: string;
  callsCount: number;
  totalDurationSeconds: number;
};

export type ActiveCall = {
  id: string;
  phone: string;
  startedAt: string;
  durationSeconds: number;
};

export interface StoreAdapter {
  getDailyUsage(
    phone: string,
    usage_date: string
  ): Promise<DailyUsage | null>;

  incrementDailyUsage(
    phone: string,
    usage_date: string,
    deltaCalls: number,
    deltaSeconds: number
  ): Promise<DailyUsage>;

  createCallSession(input: {
    id?: string;
    phone: string;
    startTime: Date;
    metadata?: Record<string, any>;
  }): Promise<CallSession>;

  endCallSession(input: {
    id: string;
    endTime: Date;
    durationSeconds: number;
    endReason: CallEndReason;
  }): Promise<CallSession | null>;

  listDailyUsage(usage_date: string): Promise<DailyUsage[]>;

  getActiveCalls(now?: Date): Promise<ActiveCall[]>;

  getCallSessionsForExport(input: {
    from?: Date;
    to?: Date;
  }): Promise<CallSession[]>;
}

/* =======================
   SUPABASE STORE
======================= */

class SupabaseStore implements StoreAdapter {
  private client = getSupabase();

  async getDailyUsage(
    phone: string,
    usage_date: string
  ): Promise<DailyUsage | null> {
    const { data, error } = await this.client
      .from("daily_usage")
      .select("*")
      .eq("phone", phone)
      .eq("usage_date", usage_date)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("daily_usage:get error", error);
    }

    if (!data) return null;

    return {
      phone: data.phone,
      usage_date: data.usage_date,
      callsCount: data.calls_count ?? 0,
      totalDurationSeconds: data.total_duration_seconds ?? 0,
    };
  }

  async incrementDailyUsage(
    phone: string,
    usage_date: string,
    deltaCalls: number,
    deltaSeconds: number
  ): Promise<DailyUsage> {
    const existing = await this.getDailyUsage(phone, usage_date);

    const next: DailyUsage = {
      phone,
      usage_date,
      callsCount: (existing?.callsCount ?? 0) + deltaCalls,
      totalDurationSeconds:
        (existing?.totalDurationSeconds ?? 0) + deltaSeconds,
    };

    const { error } = await this.client.from("daily_usage").upsert(
      {
        phone: next.phone,
        usage_date: next.usage_date,
        calls_count: next.callsCount,
        total_duration_seconds: next.totalDurationSeconds,
      },
      { onConflict: "phone,usage_date" }
    );

    if (error) {
      console.error("daily_usage:upsert error", error);
      throw error;
    }

    return next;
  }

  async createCallSession(input: {
    id?: string;
    phone: string;
    startTime: Date;
    metadata?: Record<string, any>;
  }): Promise<CallSession> {
    const id = input.id ?? crypto.randomUUID();
    const startIso = input.startTime.toISOString();
    const usage_date = startIso.slice(0, 10);

    const { error } = await this.client.from("call_sessions").insert({
      id,
      phone: input.phone,
      start_time: startIso,
      end_time: null,
      duration_seconds: 0,
      end_reason: null,
      usage_date,
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("call_sessions:insert error", error);
      throw error;
    }

    return {
      id,
      phone: input.phone,
      startTime: startIso,
      endTime: null,
      durationSeconds: 0,
      endReason: null,
      usage_date,
    };
  }

  async endCallSession(input: {
    id: string;
    endTime: Date;
    durationSeconds: number;
    endReason: CallEndReason;
  }): Promise<CallSession | null> {
    const endIso = input.endTime.toISOString();

    const { data, error } = await this.client
      .from("call_sessions")
      .update({
        end_time: endIso,
        duration_seconds: input.durationSeconds,
        end_reason: input.endReason,
      })
      .eq("id", input.id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("call_sessions:end error", error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      phone: data.phone,
      startTime: data.start_time,
      endTime: data.end_time,
      durationSeconds: data.duration_seconds ?? 0,
      endReason: data.end_reason,
      usage_date: data.usage_date,
    };
  }

  async listDailyUsage(usage_date: string): Promise<DailyUsage[]> {
    const { data, error } = await this.client
      .from("daily_usage")
      .select("*")
      .eq("usage_date", usage_date)
      .order("total_duration_seconds", { ascending: false });

    if (error) {
      console.error("daily_usage:list error", error);
      throw error;
    }

    return (data ?? []).map((row) => ({
      phone: row.phone,
      usage_date: row.usage_date,
      callsCount: row.calls_count ?? 0,
      totalDurationSeconds: row.total_duration_seconds ?? 0,
    }));
  }

  async getActiveCalls(now: Date = new Date()): Promise<ActiveCall[]> {
    const { data, error } = await this.client
      .from("call_sessions")
      .select("*")
      .is("end_time", null);

    if (error) {
      console.error("call_sessions:active error", error);
      throw error;
    }

    const nowMs = now.getTime();

    return (data ?? []).map((row) => {
      const startedMs = new Date(row.start_time).getTime();
      const durationSeconds = Math.max(
        0,
        Math.floor((nowMs - startedMs) / 1000)
      );

      return {
        id: row.id,
        phone: row.phone,
        startedAt: row.start_time,
        durationSeconds,
      };
    });
  }

  async getCallSessionsForExport(input: {
    from?: Date;
    to?: Date;
  }): Promise<CallSession[]> {
    let query = this.client.from("call_sessions").select("*");

    if (input.from) {
      query = query.gte("start_time", input.from.toISOString());
    }
    if (input.to) {
      query = query.lte("start_time", input.to.toISOString());
    }

    const { data, error } = await query.order("start_time", {
      ascending: true,
    });

    if (error) {
      console.error("call_sessions:export error", error);
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      phone: row.phone,
      startTime: row.start_time,
      endTime: row.end_time,
      durationSeconds: row.duration_seconds ?? 0,
      endReason: row.end_reason,
      usage_date: row.usage_date,
    }));
  }
}

/* =======================
   STORE SINGLETON
======================= */

let _store: StoreAdapter | null = null;

export function getStore(): StoreAdapter {
  if (_store) return _store;
  _store = new SupabaseStore();
  return _store;
}
