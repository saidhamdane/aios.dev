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
  const raw =
    "aios_" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const prefix = raw.slice(0, 12);
  return { raw, prefix };
}
