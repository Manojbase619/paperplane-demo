/**
 * Agent Builder API
 * Deterministic state machine: GET returns state + next question; POST submits answer and advances.
 */

import { NextResponse } from "next/server";
import type { AgentSpec } from "@/lib/agent-spec";
import {
  getNextBuilderQuestion,
  getEffectiveStep,
  getNextStep,
  parseConstraintsInput,
  generateCallFlowWithOpenAI,
  type BuilderState,
} from "@/lib/agent-builder";
import {
  getAgentBuilderSessionById,
  getActiveAgentBuilderSessionByUserId,
  upsertAgentBuilderSession,
  createAgent,
} from "@/lib/db-helpers";
import {
  AGENT_BUILDER_STEPS,
  type AgentBuilderStep,
} from "@/lib/agent-spec";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/** GET — get current builder state and next question */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId") ?? undefined;

    let session = null;
    if (sessionId) {
      session = await getAgentBuilderSessionById(sessionId);
    } else if (userId) {
      session = await getActiveAgentBuilderSessionByUserId(userId);
    }

    if (!session) {
      return NextResponse.json({
        session: null,
        question: "Start a new session with POST and action: start",
        state: null,
      });
    }

    const state: BuilderState = {
      current_step: session.current_step as AgentBuilderStep,
      collected_data: session.collected_data as Partial<AgentSpec>,
      status: session.status,
    };
    const question = getNextBuilderQuestion(state);

    return NextResponse.json({
      session: {
        id: session.id,
        user_id: session.user_id,
        current_step: session.current_step,
        collected_data: session.collected_data,
        status: session.status,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      question,
      state: {
        current_step: state.current_step,
        status: state.status,
      },
    });
  } catch (e) {
    console.error("Agent builder GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/** POST — start session or submit answer and advance */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "submit"; // "start" | "submit"
    const sessionId = body?.sessionId ?? null;
    const userId = body?.userId ?? null;
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (action === "start") {
      const session = await upsertAgentBuilderSession({
        user_id: userId || null,
        current_step: AGENT_BUILDER_STEPS[0],
        collected_data: {},
        status: "active",
      });
      const state: BuilderState = {
        current_step: session.current_step as AgentBuilderStep,
        collected_data: session.collected_data as Partial<AgentSpec>,
        status: session.status,
      };
      const question = getNextBuilderQuestion(state);
      return NextResponse.json({
        session: {
          id: session.id,
          user_id: session.user_id,
          current_step: session.current_step,
          collected_data: session.collected_data,
          status: session.status,
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
        question,
        agentId: null,
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId required for submit" },
        { status: 400 }
      );
    }

    const existing = await getAgentBuilderSessionById(sessionId);
    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (existing.status === "completed") {
      return NextResponse.json({
        session: existing,
        question: "Agent build is complete.",
        agentId: body?.agentId ?? null,
      });
    }

    const collected = { ...(existing.collected_data as Partial<AgentSpec>) };
    const currentStep = existing.current_step as AgentBuilderStep;

    if (message) {
      switch (currentStep) {
        case "collect_business_type":
          collected.business_type = message;
          break;
        case "collect_agent_role":
          collected.agent_role = message;
          break;
        case "collect_objective":
          collected.objective = message;
          break;
        case "collect_tone":
          collected.tone = message;
          break;
        case "collect_constraints":
          collected.constraints = parseConstraintsInput(message);
          break;
        default:
          break;
      }
    }

    let nextStep: AgentBuilderStep = getEffectiveStep(collected);

    if (nextStep === "generate_call_flow") {
      if (!OPENAI_API_KEY) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY not set" },
          { status: 500 }
        );
      }
      const callFlow = await generateCallFlowWithOpenAI(
        {
          business_type: collected.business_type!,
          agent_role: collected.agent_role!,
          objective: collected.objective!,
          tone: collected.tone!,
          constraints: collected.constraints ?? [],
        },
        OPENAI_API_KEY
      );
      collected.call_flow = callFlow;
      nextStep = "complete";
    }

    const status: "active" | "completed" =
      nextStep === "complete" ? "completed" : "active";
    const session = await upsertAgentBuilderSession({
      id: sessionId,
      user_id: existing.user_id,
      current_step: nextStep,
      collected_data: collected as Record<string, unknown>,
      status,
    });

    let agentId: string | null = null;
    if (status === "completed" && collected.business_type && collected.agent_role) {
      const agent = await createAgent({
        name: `${collected.business_type} - ${collected.agent_role}`.slice(0, 255),
        description: collected.objective ?? null,
        spec_json: collected as unknown as Record<string, unknown>,
        version: 1,
      });
      agentId = agent?.id ?? null;
    }

    const state: BuilderState = {
      current_step: session.current_step as AgentBuilderStep,
      collected_data: session.collected_data as Partial<AgentSpec>,
      status: session.status,
    };
    const question = getNextBuilderQuestion(state);

    return NextResponse.json({
      session: {
        id: session.id,
        user_id: session.user_id,
        current_step: session.current_step,
        collected_data: session.collected_data,
        status: session.status,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      question,
      agentId,
    });
  } catch (e) {
    console.error("Agent builder POST error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
