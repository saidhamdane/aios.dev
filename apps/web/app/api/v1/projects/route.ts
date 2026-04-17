import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireApiKey } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { z } from "zod";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

async function resolveAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer aios_")) {
    return requireApiKey(request);
  }
  return requireAuth();
}

export async function GET(request: NextRequest) {
  const { user, error } = await resolveAuth(request);
  if (error) return error;

  const supabase = await createClient();
  const { data: projects, error: dbError } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (dbError) return err(dbError.message, 500);

  return ok({
    projects,
    total: projects?.length ?? 0,
  });
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

  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.errors[0]?.message ?? "Validation error");
  }

  const supabase = await createClient();
  const { data: project, error: dbError } = await supabase
    .from("projects")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      owner_id: user.id,
    })
    .select()
    .single();

  if (dbError) return err(dbError.message, 500);

  return ok({ project }, 201);
}
