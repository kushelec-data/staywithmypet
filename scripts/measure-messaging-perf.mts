/**
 * Read-only dev script: measure real Supabase round-trip timings for messaging.
 * Does not insert chat messages. Usage: npx tsx scripts/measure-messaging-perf.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  fetchConversations,
  fetchMessages,
  markConversationFullyRead,
} from "../src/lib/messaging";

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

async function signInAsMessagingUser(): Promise<{
  supabase: ReturnType<typeof createClient>;
  userId: string;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const perfEmail = process.env.MESSAGING_PERF_EMAIL?.trim();
  const perfPassword = process.env.MESSAGING_PERF_PASSWORD?.trim();

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (perfEmail && perfPassword) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: perfEmail,
      password: perfPassword,
    });
    if (error || !data.user?.id) {
      throw new Error(`MESSAGING_PERF_EMAIL sign-in failed: ${error?.message ?? "no user"}`);
    }
    return { supabase, userId: data.user.id };
  }

  const { data: activeMembershipRows, error: membershipError } = await admin
    .from("user_memberships")
    .select("user_id")
    .in("status", ["active"])
    .limit(100);

  if (membershipError) {
    throw new Error(`user_memberships lookup failed: ${membershipError.message}`);
  }

  const activeUserIds = new Set(
    (activeMembershipRows ?? []).map((row) => row.user_id as string).filter(Boolean),
  );

  const { data: conversationRows, error: convListError } = await admin
    .from("conversations")
    .select("id, request_id, pet_parent_id, pet_friend_id")
    .order("created_at", { ascending: false })
    .limit(25);

  if (convListError || !conversationRows?.length) {
    throw new Error("No conversations found for measurement");
  }

  const conversationRow =
    conversationRows.find(
      (row) =>
        activeUserIds.has(row.pet_parent_id as string) ||
        activeUserIds.has(row.pet_friend_id as string),
    ) ?? conversationRows[0]!;

  const candidateIds = [
    conversationRow.pet_parent_id as string,
    conversationRow.pet_friend_id as string,
  ].filter(Boolean);

  const preferredIds = candidateIds.filter((id) => activeUserIds.has(id));
  const userIdsToTry = preferredIds.length ? preferredIds : candidateIds;

  let email: string | null = null;
  let userId: string | null = null;

  for (const id of userIdsToTry) {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(id);
    if (!userError && userData.user?.email) {
      email = userData.user.email;
      userId = userData.user.id;
      break;
    }
  }

  if (!email || !userId) {
    throw new Error("Could not resolve a messaging user email for magic-link sign-in");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkError?.message ?? "no token"}`);
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionError || !sessionData.user?.id) {
    throw new Error(`verifyOtp failed: ${sessionError?.message ?? "no session"}`);
  }

  return { supabase, userId: sessionData.user.id };
}

async function main(): Promise<void> {
  const timings: Array<{ operation: string; durationMs: number; detail?: string }> = [];

  loadEnvLocal();

  const { supabase, userId } = await signInAsMessagingUser();
  console.info(`[measure-messaging-perf] signed in as ${userId}`);

  let startedAt = performance.now();
  const conversations = await fetchConversations(supabase, userId);
  timings.push({
    operation: "fetchConversations",
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    detail: `${conversations.length} conversations`,
  });
  console.info(`[measure-messaging-perf] inbox conversations: ${conversations.length}`);

  if (!conversations.length) {
    console.info(JSON.stringify({ userId, timings, note: "read-only; send not measured" }, null, 2));
    return;
  }

  const thread = conversations[0]!;

  startedAt = performance.now();
  const messagePage = await fetchMessages(supabase, thread.id, userId);
  timings.push({
    operation: "fetchMessages",
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    detail: `${messagePage.messages.length} messages loaded, hasOlder=${messagePage.hasOlder}`,
  });

  startedAt = performance.now();
  await markConversationFullyRead(supabase, thread, userId);
  timings.push({
    operation: "markConversationFullyRead",
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
  });

  console.info(
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        supabaseHost: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host,
        userId,
        conversationId: thread.id,
        timings,
        comparisonNotes: {
          fetchMessages: "paginated newest 50 (was: full thread history)",
          fetchConversations: "inbox preview uses latest message per conversation (was: all messages scan)",
          sendMessage: "not invoked (read-only); precheck + parallel guards in app code",
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[measure-messaging-perf] failed:", err);
  process.exit(1);
});
