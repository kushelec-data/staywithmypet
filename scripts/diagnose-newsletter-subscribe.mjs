/**
 * Newsletter subscription diagnostic — table existence, insert probe.
 * Usage: node scripts/diagnose-newsletter-subscribe.mjs [email]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const testEmail = (process.argv[2] ?? `diag-${Date.now()}@example.com`).trim().toLowerCase();

  console.log("=== Config ===");
  console.log("SUPABASE_URL:", url ?? "(missing)");
  console.log("SERVICE_ROLE_KEY:", serviceKey ? `${serviceKey.slice(0, 12)}…` : "(missing)");
  console.log("Test email:", testEmail);

  if (!url || !serviceKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== Table probe (SELECT) ===");
  const { data: rows, error: selectErr } = await admin
    .from("newsletter_subscribers")
    .select("id, email, subscribed_at, created_at")
    .limit(1);

  if (selectErr) {
    console.log("SELECT ERROR:", selectErr.code, selectErr.message);
    console.log("details:", selectErr.details);
    console.log("hint:", selectErr.hint);
  } else {
    console.log("SELECT OK — table exists, sample rows:", JSON.stringify(rows));
  }

  console.log("\n=== Insert probe (service role) ===");
  const { data: inserted, error: insertErr } = await admin
    .from("newsletter_subscribers")
    .insert({ email: testEmail })
    .select("id, email")
    .maybeSingle();

  if (insertErr) {
    console.log("INSERT ERROR:", insertErr.code, insertErr.message);
    console.log("details:", insertErr.details);
    console.log("hint:", insertErr.hint);
  } else {
    console.log("INSERT OK:", JSON.stringify(inserted));
    await admin.from("newsletter_subscribers").delete().eq("email", testEmail);
    console.log("Cleanup: deleted test row");
  }

  console.log("\n=== Duplicate probe ===");
  const dupEmail = `dup-${Date.now()}@example.com`;
  const first = await admin.from("newsletter_subscribers").insert({ email: dupEmail }).select("id").maybeSingle();
  const second = await admin.from("newsletter_subscribers").insert({ email: dupEmail }).select("id").maybeSingle();
  console.log("First insert:", first.error ? `${first.error.code} ${first.error.message}` : "OK");
  console.log("Second insert:", second.error ? `${second.error.code} ${second.error.message}` : "OK");
  if (!first.error) {
    await admin.from("newsletter_subscribers").delete().eq("email", dupEmail);
    console.log("Cleanup: deleted duplicate test row");
  }

  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
