import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireApiKey } from "@/lib/api/auth";
import { ok, err } from "@/lib/api/response";
import { z } from "zod";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
});

async function resolveAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer aios_")) return requireApiKey(request);
  return requireAuth();
}

async function getOwnedProject(userId: string, projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .single();
  return { data, error };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await resolveAuth(request);
  if (error) return error;

  const { data: project, error: dbError } = await getOwnedProject(user.id, id);
  if (dbError || !project) return err("Project not found", 404);

  return ok({ project });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await resolveAuth(request);
  if (error) return error;

  const { data: existing } = await getOwnedProject(user.id, id);
  if (!existing) return err("Project not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("Invalid JSON body");
  }

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.errors[0]?.message ?? "Validation error");

  const supabase = await createClient();
  const { data: project, error: dbError } = await supabase
    .from("projects")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (dbError) return err(dbError.message, 500);
  return ok({ project });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, error } = await resolveAuth(request);
  if (error) return error;

  const { data: existing } = await getOwnedProject(user.id, id);
  if (!existing) return err("Project not found", 404);

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (dbError) return err(dbError.message, 500);
  return ok({ deleted: true });
}
