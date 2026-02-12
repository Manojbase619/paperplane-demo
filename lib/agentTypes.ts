export interface AgentRecord {
  id: string;
  external_agent_id: string | null;
  name: string;
  voice_id: string | null;
  prompt: string | null;
  greeting: string | null;
  inactivity_config: Record<string, unknown>;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const VOICE_OPTIONS = [
  { id: "alloy", label: "Alloy" },
  { id: "echo", label: "Echo" },
  { id: "fable", label: "Fable" },
  { id: "onyx", label: "Onyx" },
  { id: "nova", label: "Nova" },
  { id: "shimmer", label: "Shimmer" },
] as const;
