import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { err } from "@/lib/api/response";
import type { Profile } from "@/lib/supabase/types";

export async function requireAuth(): Promise<
  { user: Profile; error: null } | { user: null; error: ReturnType<typeof err> }
> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: err("Unauthorized", 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { user: null, error: err("Profile not found", 404) };
  }

  return { user: profile, error: null };
}

export async function requireApiKey(request: Request): Promise<
  { user: Profile; error: null } | { user: null; error: ReturnType<typeof err> }
> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: err("Missing API key", 401) };
  }

  const rawKey = authHeader.slice(7);
  const keyHash = await hashApiKey(rawKey);

  const supabase = await createServiceClient();
  const { data: apiKey } = await supabase
    .from("api_keys")
    .select("*, profiles!api_keys_owner_id_fkey(*)")
    .eq("key_hash", keyHash)
    .single();

  if (!apiKey) {
    return { user: null, error: err("Invalid API key", 401) };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { user: null, error: err("API key expired", 401) };
  }

  // Update last_used_at without awaiting
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  const profile = (apiKey as { profiles: Profile }).profiles;
  return { user: profile, error: null };
}

export async function hashApiKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateApiKey(): { raw: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = "aios_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const prefix = raw.slice(0, 12);
  return { raw, prefix };
}
