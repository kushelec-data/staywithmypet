/**
 * Remove [perf-probe ...] messages created by measure-messaging-perf.mts.
 * Usage: npx tsx scripts/cleanup-perf-probe-messages.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
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

async function main(): Promise<void> {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: probeRows, error: selectError } = await admin
    .from("messages")
    .select("id, conversation_id, body, created_at")
    .like("body", "[perf-probe%");

  if (selectError) {
    throw new Error(`Failed to list probe messages: ${selectError.message}`);
  }

  const rows = probeRows ?? [];
  if (!rows.length) {
    console.info("[cleanup-perf-probe] no probe messages found");
    return;
  }

  const ids = rows.map((row) => row.id as string);
  const { error: deleteError } = await admin.from("messages").delete().in("id", ids);

  if (deleteError) {
    throw new Error(`Failed to delete probe messages: ${deleteError.message}`);
  }

  console.info(
    `[cleanup-perf-probe] deleted ${ids.length} message(s):`,
    rows.map((row) => ({
      id: row.id,
      conversation_id: row.conversation_id,
      body: row.body,
      created_at: row.created_at,
    })),
  );
}

main().catch((err) => {
  console.error("[cleanup-perf-probe] failed:", err);
  process.exit(1);
});
