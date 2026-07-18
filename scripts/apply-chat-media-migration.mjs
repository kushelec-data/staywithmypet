/**
 * Applies supabase/migrations/20260718180000_chat_media.sql to the linked project.
 * Requires SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.local (Database password).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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

function resolveDbUrl(env) {
  if (env.SUPABASE_DB_URL?.trim()) return env.SUPABASE_DB_URL.trim();
  const password = env.SUPABASE_DB_PASSWORD?.trim();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !url) return null;
  const ref = new URL(url).hostname.split(".")[0];
  const encoded = encodeURIComponent(password);
  return [
    `postgresql://postgres.${ref}:${encoded}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`,
  ];
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const dbUrls = resolveDbUrl(env);
  if (!dbUrls) {
    console.error(
      "Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env.local (Supabase Dashboard → Database → password).",
    );
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "20260718180000_chat_media.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const urls = Array.isArray(dbUrls) ? dbUrls : [dbUrls];
  let lastError = null;
  for (const dbUrl of urls) {
    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      console.log("Applied chat-media migration successfully via:", dbUrl.replace(/:[^:@]+@/, ":***@"));
      return;
    } catch (err) {
      lastError = err;
      console.warn("Connection failed:", dbUrl.replace(/:[^:@]+@/, ":***@"), "-", err.message);
    } finally {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  throw lastError ?? new Error("Could not connect to database.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
