import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = ".env.local";
  if (!fs.existsSync(path)) return {};
  const env = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
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

const env = { ...process.env, ...loadEnvLocal() };
const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "chat-media";

async function main() {
  console.log("=== Supabase chat-media diagnostics ===");
  console.log("URL:", url);

  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
  if (bucketsError) {
    console.error("listBuckets error:", bucketsError);
  } else {
    const chatBucket = buckets?.find((b) => b.id === BUCKET || b.name === BUCKET);
    console.log("\n--- Storage bucket ---");
    console.log("chat-media exists:", Boolean(chatBucket));
    if (chatBucket) {
      console.log("  id:", chatBucket.id);
      console.log("  name:", chatBucket.name);
      console.log("  public:", chatBucket.public);
      console.log("  file_size_limit:", chatBucket.file_size_limit);
      console.log("  allowed_mime_types:", chatBucket.allowed_mime_types);
    } else {
      console.log("  available buckets:", buckets?.map((b) => b.id).join(", ") ?? "(none)");
    }
  }

  console.log("\n--- messages table columns ---");
  const columnChecks = [
    "storage_path",
    "media_type",
    "file_name",
    "file_size",
    "mime_type",
  ];
  for (const col of columnChecks) {
    const { error } = await admin.from("messages").select(col).limit(0);
    console.log(`  ${col}:`, error ? `MISSING/ERROR (${error.code}: ${error.message})` : "OK");
  }

  console.log("\n--- Storage upload test (service role) ---");
  const testPath = `diagnostics/service-test/${crypto.randomUUID()}.txt`;
  const testBody = new Blob(["chat-media diagnostic"], { type: "text/plain" });
  const { data: uploadData, error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(testPath, testBody, { contentType: "text/plain", upsert: false });

  if (uploadError) {
    console.error("  upload error:", {
      name: uploadError.name,
      message: uploadError.message,
      statusCode: uploadError.statusCode ?? uploadError.status ?? "(none)",
    });
  } else {
    console.log("  upload OK:", uploadData?.path ?? testPath);
    await admin.storage.from(BUCKET).remove([testPath]);
  }

  if (anonKey) {
    console.log("\n--- Storage upload test (anon, no user JWT) ---");
    const anon = createClient(url, anonKey);
    const anonPath = `diagnostics/anon-test/${crypto.randomUUID()}.txt`;
    const { error: anonUploadError } = await anon.storage
      .from(BUCKET)
      .upload(anonPath, testBody, { contentType: "text/plain" });
    if (anonUploadError) {
      console.log("  expected anon upload error:", {
        name: anonUploadError.name,
        message: anonUploadError.message,
        statusCode: anonUploadError.statusCode ?? anonUploadError.status ?? "(none)",
      });
    } else {
      console.log("  anon upload unexpectedly succeeded");
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
