import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireApiKey } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { z } from "zod";
import { MODELS } from "@/lib/claude";

const CreateAgentSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  model: z.enum(Object.keys(MODELS) as [string, ...string[]]).default("claude-sonnet-4-6"),
  system_prompt: z.string().max(10000).optional(),
  tools: z.array(z.record(z.unknown())).optional(),
  config: z.record(z.unknown()).optional(),
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

  const supabase = await createClient();
  let query = supabase
    .from("agents")
    .select("*, projects!inner(name, owner_id)")
    .eq("projects.owner_id", user.id)
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: agents, error: dbError } = await query;
  if (dbError) return err(dbError.message, 500);

  return ok({ agents, total: agents?.length ?? 0 });
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

  const parsed = CreateAgentSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Validation error");

  const supabase = await createClient();

  // Verify user owns the project
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.project_id)
    .eq("owner_id", user.id)
    .single();

  if (!project) return err("Project not found or access denied", 403);

  const { data: agent, error: dbError } = await supabase
    .from("agents")
    .insert({
      project_id: parsed.data.project_id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      model: parsed.data.model,
      system_prompt: parsed.data.system_prompt ?? null,
      tools: parsed.data.tools ?? [],
      config: parsed.data.config ?? {},
    })
    .select()
    .single();

  if (dbError) return err(dbError.message, 500);
  return ok({ agent }, 201);
}
