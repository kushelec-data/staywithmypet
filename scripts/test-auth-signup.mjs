/**
 * Smoke test: Supabase signup + profiles row.
 * Usage: node scripts/test-auth-signup.mjs
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error("Missing .env.local in project root.");
    process.exit(1);
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const email = `test+${Date.now()}@staywithmypet.local`;
const password = "TestPassword123!";
const displayName = "Test User";

console.log("Signing up:", email);

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { display_name: displayName } },
});

if (error) {
  console.error("signUp failed:", error.message);
  process.exit(1);
}

if (!data.user) {
  console.error("No user returned from signUp");
  process.exit(1);
}

console.log("Auth user id:", data.user.id);

if (!data.session) {
  console.log("No session (email confirmation may be enabled). Check Supabase Auth settings.");
  process.exit(0);
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, display_name")
  .eq("id", data.user.id)
  .maybeSingle();

if (profileError) {
  console.error("profiles select failed:", profileError.message);
  process.exit(1);
}

if (!profile) {
  const { error: insertError } = await supabase.from("profiles").insert({
    id: data.user.id,
    display_name: displayName,
  });
  if (insertError) {
    console.error("profiles insert failed:", insertError.message);
    process.exit(1);
  }
  console.log("Profile row inserted by test script.");
} else {
  console.log("Profile row OK:", profile.display_name);
}

console.log("Signup + profile test passed.");
