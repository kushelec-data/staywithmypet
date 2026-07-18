/**
 * End-to-end chat media upload test (JPG + MP4).
 * Usage: node scripts/test-chat-media-upload.mjs
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "chat-media";

function loadEnvLocal() {
  const env = {};
  const path = ".env.local";
  if (!fs.existsSync(path)) return env;
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

function logStorageError(label, error) {
  console.error(`  ${label}:`, {
    name: error?.name ?? "(none)",
    message: error?.message ?? String(error),
    statusCode: error?.statusCode ?? error?.status ?? "(none)",
  });
}

function logPostgrestError(label, error) {
  console.error(`  ${label}:`, {
    code: error?.code ?? "(none)",
    message: error?.message ?? String(error),
    details: error?.details ?? "(none)",
    hint: error?.hint ?? "(none)",
  });
}

function minimalJpegBytes() {
  // 1x1 JPEG
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
    "base64",
  );
}

function minimalMp4Bytes() {
  // Minimal ftyp box (not playable everywhere; enough for storage MIME test)
  const buf = Buffer.alloc(32);
  buf.writeUInt32BE(32, 0);
  buf.write("ftyp", 4);
  buf.write("isom", 8);
  buf.writeUInt32BE(512, 12);
  buf.write("isom", 16);
  buf.write("iso2", 20);
  buf.write("mp41", 24);
  return buf;
}

function buildPath(conversationId, userId, stem, ext) {
  const safe = stem.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return `conversations/${conversationId}/${userId}/${crypto.randomUUID()}-${safe}.${ext}`;
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !serviceKey || !anonKey) {
    console.error("Missing Supabase env vars in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== Chat media upload test ===\n");

  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .select("id, pet_parent_id, pet_friend_id")
    .limit(1)
    .maybeSingle();

  if (convError || !conversation) {
    logPostgrestError("conversation lookup", convError ?? { message: "No conversation found" });
    process.exit(1);
  }

  const senderId = conversation.pet_parent_id ?? conversation.pet_friend_id;
  console.log("Conversation:", conversation.id);
  console.log("Sender:", senderId);

  const tests = [
    {
      label: "JPG",
      mime: "image/jpeg",
      ext: "jpg",
      fileName: "test-photo.jpg",
      body: minimalJpegBytes(),
    },
    {
      label: "MP4",
      mime: "video/mp4",
      ext: "mp4",
      fileName: "test-video.mp4",
      body: minimalMp4Bytes(),
    },
  ];

  for (const test of tests) {
    console.log(`\n--- ${test.label} ---`);
    const stem = test.fileName.includes(".")
      ? test.fileName.slice(0, test.fileName.lastIndexOf("."))
      : test.fileName;
    const storagePath = buildPath(conversation.id, senderId, stem, test.ext);
    console.log("Path:", storagePath);

    const blob = new Blob([test.body], { type: test.mime });
    const file = new File([blob], test.fileName, { type: test.mime });

    // Service role upload (bypasses participant RLS)
    const { error: adminUploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: test.mime, upsert: false });

    if (adminUploadError) {
      console.log("Stage: storage upload (service role)");
      logStorageError("FAILED", adminUploadError);
      continue;
    }
    console.log("Stage: storage upload (service role) — OK");

    const insertPayload = {
      conversation_id: conversation.id,
      sender_id: senderId,
      body: "",
      storage_path: storagePath,
      media_type: test.mime.startsWith("video/") ? "video" : "image",
      file_name: test.fileName,
      file_size: test.body.length,
      mime_type: test.mime,
    };

    const { data: inserted, error: insertError } = await admin
      .from("messages")
      .insert(insertPayload)
      .select("id, storage_path, media_type")
      .single();

    if (insertError) {
      console.log("Stage: message insert");
      logPostgrestError("FAILED", insertError);
      await admin.storage.from(BUCKET).remove([storagePath]);
      continue;
    }
    console.log("Stage: message insert — OK", inserted?.id);

    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (signError) {
      console.log("Stage: signed URL");
      logStorageError("FAILED", signError);
    } else {
      console.log("Stage: signed URL — OK", signed?.signedUrl?.slice(0, 80) + "...");
    }

    if (inserted?.id) {
      await admin.from("messages").delete().eq("id", inserted.id);
    }
    await admin.storage.from(BUCKET).remove([storagePath]);
    console.log("Cleanup — OK");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
