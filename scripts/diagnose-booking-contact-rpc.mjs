/**
 * Checks whether get_booking_participant_contact exists on the linked Supabase project.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  console.log("Supabase URL:", url ?? "(missing)");
  console.log("Service role key:", serviceKey ? "set" : "missing");
  console.log("DB password:", env.SUPABASE_DB_PASSWORD ? "set" : "missing");

  if (!url || !serviceKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const bookingId = process.argv[2]?.trim();
  if (!bookingId) {
    console.log("\nUsage: node scripts/diagnose-booking-contact-rpc.mjs <booking-id>");
    console.log("Probing RPC existence via PostgREST…");
  }

  const restUrl = `${url}/rest/v1/rpc/get_booking_participant_contact`;
  const res = await fetch(restUrl, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_booking_id: bookingId ?? "00000000-0000-0000-0000-000000000000" }),
  });

  const body = await res.text();
  console.log("\nRPC probe HTTP status:", res.status);
  console.log("Response:", body.slice(0, 500));

  if (res.status === 404 || body.includes("PGRST202") || body.includes("42883")) {
    console.log("\nResult: get_booking_participant_contact is MISSING on remote.");
    process.exit(2);
  }

  console.log("\nResult: RPC exists on remote.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
