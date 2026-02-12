/**
 * AgentSpec — schema-driven agent configuration.
 * All agent configuration must conform to this schema. No free-form prompts.
 */

export interface AgentSpec {
  business_type: string;
  agent_role: string;
  objective: string;
  tone: string;
  constraints: string[];
  call_flow: {
    introduction: string;
    verification: string;
    purpose: string;
    information_gathering: string[];
    closing: string;
  };
}

export type AgentSpecKey = keyof Omit<AgentSpec, "call_flow">;

/** Builder steps in deterministic order */
export const AGENT_BUILDER_STEPS = [
  "collect_business_type",
  "collect_agent_role",
  "collect_objective",
  "collect_tone",
  "collect_constraints",
  "generate_call_flow",
  "complete",
] as const;

export type AgentBuilderStep = (typeof AGENT_BUILDER_STEPS)[number];

export function isAgentBuilderStep(s: string): s is AgentBuilderStep {
  return (AGENT_BUILDER_STEPS as readonly string[]).includes(s);
}

/** Fields that must be collected before generating call_flow */
export const COLLECTED_FIELDS: AgentSpecKey[] = [
  "business_type",
  "agent_role",
  "objective",
  "tone",
  "constraints",
];
