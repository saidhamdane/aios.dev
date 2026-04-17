import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireApiKey } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { z } from "zod";
import { runAgent } from "@/lib/claude";
import type { ModelId } from "@/lib/claude";

const CreateSessionSchema = z.object({
  project_id: z.string().uuid(),
  agent_id: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().or(z.array(z.record(z.unknown()))),
    })
  ),
  model: z.string().optional(),
  system_prompt: z.string().optional(),
  max_tokens: z.number().min(1).max(8192).optional(),
});

async function resolveAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer aios_")) return requireApiKey(request);
  return requireAuth();
}

export async function GET(request: NextRequest) {
  const { user, error } = await resolveAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const supabase = await createClient();
  let query = supabase
    .from("sessions")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (projectId) query = query.eq("project_id", projectId);

  const { data: sessions, error: dbError, count } = await query;
  if (dbError) return err(dbError.message, 500);

  return ok({ sessions, total: count ?? 0, limit, offset });
}

export async function POST(request: NextRequest) {
  const { user, error } = await resolveAuth(request);
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Validation error");

  const supabase = await createClient();

  // Verify quota
  const { data: profile } = await supabase
    .from("profiles")
    .select("api_quota_used, api_quota_limit, plan")
    .eq("id", user.id)
    .single();

  if (profile && profile.api_quota_used >= profile.api_quota_limit) {
    return err("API quota exceeded. Upgrade your plan to continue.", 429);
  }

  // Resolve agent config
  let model = (parsed.data.model ?? "claude-sonnet-4-6") as ModelId;
  let systemPrompt = parsed.data.system_prompt;

  if (parsed.data.agent_id) {
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", parsed.data.agent_id)
      .single();

    if (agent) {
      model = agent.model as ModelId;
      systemPrompt = systemPrompt ?? agent.system_prompt ?? undefined;
    }
  }

  // Create session record
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      project_id: parsed.data.project_id,
      agent_id: parsed.data.agent_id ?? null,
      user_id: user.id,
      status: "running",
    })
    .select()
    .single();

  if (sessionError || !session) return err(sessionError?.message ?? "Failed to create session", 500);

  // Run the agent
  try {
    const { response, inputTokens, outputTokens, costUsd } = await runAgent({
      model,
      systemPrompt,
      messages: parsed.data.messages as Parameters<typeof runAgent>[0]["messages"],
      maxTokens: parsed.data.max_tokens,
    });

    // Update session with results
    await supabase
      .from("sessions")
      .update({
        status: "completed",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
        ended_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    // Increment quota
    await supabase
      .from("profiles")
      .update({ api_quota_used: (profile?.api_quota_used ?? 0) + 1 })
      .eq("id", user.id);

    return ok({
      session_id: session.id,
      content: response.content,
      model: response.model,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
      stop_reason: response.stop_reason,
    }, 201);
  } catch (agentError) {
    await supabase
      .from("sessions")
      .update({ status: "failed", ended_at: new Date().toISOString() })
      .eq("id", session.id);

    return err(agentError instanceof Error ? agentError.message : "Agent execution failed", 500);
  }
}
