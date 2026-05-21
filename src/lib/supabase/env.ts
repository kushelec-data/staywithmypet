/**
 * Supabase public env — must use literal process.env.NEXT_PUBLIC_* keys
 * so Next.js inlines them into the client bundle.
 */

function trimEnv(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    return unquoted || undefined;
  }
  return trimmed;
}

export function getSupabasePublicEnv() {
  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return { url, anonKey };
}

export function assertSupabasePublicEnv(): { url: string; anonKey: string } {
  const { url, anonKey } = getSupabasePublicEnv();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    const hint =
      "Add them to .env.local in the project root (next to package.json), then restart the dev server.";
    if (typeof console !== "undefined" && process.env.NODE_ENV === "development") {
      console.error(`[StayWithMyPet] Missing Supabase env: ${missing.join(", ")}. ${hint}`);
    }
    throw new Error(`Missing Supabase env (${missing.join(", ")}). ${hint}`);
  }

  return { url: String(url), anonKey: String(anonKey) };
}
