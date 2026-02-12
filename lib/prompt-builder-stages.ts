/**
 * Multi-stage prompt builder framework.
 * Structured flow: Agent Identity → Compliance → Operational Rules → Conversation Architecture → Output.
 */

export type StageId = "identity" | "compliance" | "operational" | "conversation" | "output";

export type FieldType = "select" | "multiselect" | "text" | "textarea" | "boolean";

export type StageQuestion = {
  id: string;
  label: string;
  placeholder?: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export type Stage = {
  id: StageId;
  title: string;
  description: string;
  questions: StageQuestion[];
};

export const STAGES: Stage[] = [
  {
    id: "identity",
    title: "Agent Identity",
    description: "Define the agent's business context and scope.",
    questions: [
      { id: "business_domain", label: "What is the agent's business domain?", type: "text", required: true, placeholder: "e.g. Loan recovery, Healthcare scheduling" },
      { id: "regulated", label: "Is it regulated?", type: "select", required: true, options: [
        { value: "yes_finance", label: "Yes — Finance" },
        { value: "yes_healthcare", label: "Yes — Healthcare" },
        { value: "yes_insurance", label: "Yes — Insurance" },
        { value: "yes_legal", label: "Yes — Legal" },
        { value: "yes_other", label: "Yes — Other regulated" },
        { value: "no", label: "No" },
      ]},
      { id: "inbound_outbound", label: "Inbound or outbound?", type: "select", required: true, options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ]},
      { id: "conversational_transactional", label: "Conversational or transactional?", type: "select", required: true, options: [
        { value: "conversational", label: "Conversational" },
        { value: "transactional", label: "Transactional" },
      ]},
      { id: "sensitive_data", label: "Does it collect sensitive data?", type: "select", required: true, options: [
        { value: "yes_pii", label: "Yes — PII" },
        { value: "yes_financial", label: "Yes — Financial" },
        { value: "yes_health", label: "Yes — Health" },
        { value: "no", label: "No" },
      ]},
    ],
  },
  {
    id: "compliance",
    title: "Compliance Interrogation",
    description: "Mandatory compliance and liability boundaries.",
    questions: [
      { id: "regulated_jurisdiction", label: "Does this agent operate in a regulated jurisdiction?", type: "boolean", required: true },
      { id: "kyc_verification", label: "Does it need KYC verification?", type: "boolean", required: true },
      { id: "recording_consent", label: "Is recording consent required?", type: "boolean", required: true },
      { id: "disclosure_scripts", label: "Does it need disclosure scripts?", type: "boolean", required: true },
      { id: "legal_language", label: "Is there required legal language?", type: "textarea", placeholder: "e.g. Specific disclaimers or scripts" },
      { id: "allowed_negotiate", label: "Is it allowed to negotiate?", type: "boolean", required: true },
      { id: "allowed_threaten_legal", label: "Is it allowed to threaten legal action?", type: "boolean", required: true },
      { id: "escalate_to_human", label: "Should it escalate to human?", type: "boolean", required: true },
      { id: "tone_restrictions", label: "What tone restrictions exist?", type: "textarea", placeholder: "e.g. No aggression, must be empathetic" },
      { id: "harassment_limitations", label: "Are there harassment limitations?", type: "textarea", placeholder: "e.g. Call frequency, time of day" },
      { id: "payment_restructuring", label: "Is it allowed to discuss payment restructuring?", type: "boolean", required: true },
    ],
  },
  {
    id: "operational",
    title: "Operational Rules",
    description: "How the agent should behave operationally.",
    questions: [
      { id: "verify_identity", label: "Should it verify identity?", type: "boolean", required: true },
      { id: "strict_call_flow", label: "Should it follow a strict call flow?", type: "boolean", required: true },
      { id: "collect_structured_data", label: "Should it collect structured data?", type: "boolean", required: true },
      { id: "objection_handling", label: "Should it follow objection handling?", type: "boolean", required: true },
      { id: "escalation_triggers", label: "Should it have escalation triggers?", type: "textarea", placeholder: "e.g. After 2 refusals, request for manager" },
      { id: "stop_after_resistance", label: "Should it stop after X resistance?", type: "text", placeholder: "e.g. After 3 no's, close politely" },
    ],
  },
  {
    id: "conversation",
    title: "Conversation Architecture",
    description: "Call flow and conversation structure.",
    questions: [
      { id: "call_flow_sections", label: "Should it use call flow sections?", type: "boolean", required: true },
      { id: "state_machine_style", label: "Should it use state machine style?", type: "boolean", required: true },
      { id: "confirm_data", label: "Should it confirm data before closing?", type: "boolean", required: true },
      { id: "summarize_before_closing", label: "Should it summarize before closing?", type: "boolean", required: true },
    ],
  },
  {
    id: "output",
    title: "Output Generation",
    description: "Generate your structured system instructions.",
    questions: [],
  },
];

export function getStage(id: StageId): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getStageOrder(): StageId[] {
  return STAGES.map((s) => s.id);
}

export function getNextStage(current: StageId): StageId | null {
  const order = getStageOrder();
  const i = order.indexOf(current);
  return i >= 0 && i < order.length - 1 ? order[i + 1]! : null;
}

export function getPrevStage(current: StageId): StageId | null {
  const order = getStageOrder();
  const i = order.indexOf(current);
  return i > 0 ? order[i - 1]! : null;
}

/** Build a single context string from all stage answers for the LLM */
export function buildBlueprintFromAnswers(answers: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const stage of STAGES) {
    if (stage.id === "output") continue;
    const section: string[] = [`## ${stage.title}`];
    for (const q of stage.questions) {
      const v = answers[q.id];
      if (v === undefined || v === null || v === "") continue;
      const display = typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);
      section.push(`- ${q.label}: ${display}`);
    }
    if (section.length > 1) parts.push(section.join("\n"));
  }
  return parts.join("\n\n");
}
