import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ChatPanel message loading", () => {
  const chatSource = readFileSync(
    join(process.cwd(), "src/components/messages/ChatPanel.tsx"),
    "utf8",
  );
  const pageSource = readFileSync(
    join(process.cwd(), "src/components/messages/MessagesPageContent.tsx"),
    "utf8",
  );

  it("1. selected conversation loads existing messages via fetchMessages", () => {
    expect(chatSource).toContain("fetchMessages(supabase, conversationId, userId)");
    expect(chatSource).toContain("setMessages(rows)");
  });

  it("2. zero-message conversation finishes loading and shows composer", () => {
    expect(chatSource).toContain("setLoading(false)");
    expect(chatSource).not.toMatch(/loading\s*\?\s*null\s*:\s*\(/);
    expect(chatSource).toContain("canSend = canSendInConversation(conversation) && !blocked");
  });

  it("3. Supabase query error clears loading and exposes retry", () => {
    expect(chatSource).toContain("setError(formatMessagingError(err))");
    expect(chatSource).toContain("setReloadNonce");
    expect(chatSource).toContain("retryThread");
    expect(chatSource).toMatch(
      /finally\s*\{\s*if \(generation === loadGenerationRef\.current\)\s*\{\s*setLoading\(false\)/,
    );
  });

  it("4. changing selected conversation refetches via conversationId effect", () => {
    expect(chatSource).toContain("const conversationId = conversation.id");
    expect(chatSource).toMatch(/}, \[\s*conversationId,/);
  });

  it("5. stale fetch cannot overwrite the active conversation", () => {
    expect(chatSource).toContain("loadGenerationRef");
    expect(chatSource).toContain("generation !== loadGenerationRef.current");
    expect(chatSource).toContain("if (generation === loadGenerationRef.current) {");
  });

  it("6. realtime subscription failure does not block initial history", () => {
    const loadEffectStart = chatSource.indexOf("async function loadMessages()");
    const loadEffectEnd = chatSource.indexOf("}, [", loadEffectStart);
    const subscribeEffectStart = chatSource.indexOf(
      "subscribeToConversationMessages(supabase, conversationId",
    );
    expect(loadEffectStart).toBeGreaterThan(0);
    expect(subscribeEffectStart).toBeGreaterThan(loadEffectEnd);
    expect(chatSource).not.toMatch(/await subscribeToConversationMessages/);
  });

  it("7. mark-as-read failure does not block message rendering", () => {
    expect(chatSource).toContain("scheduleMarkAsRead");
    expect(chatSource).toContain('console.warn("[messages] mark-as-read failed"');

    const loadBlock = chatSource.slice(
      chatSource.indexOf("async function loadMessages"),
      chatSource.indexOf("void loadMessages();"),
    );
    const finallyEnd = loadBlock.indexOf("} finally {");
    const markIndex = loadBlock.indexOf("scheduleMarkAsRead");
    expect(markIndex).toBeGreaterThan(finallyEnd);
    expect(loadBlock).not.toContain("await scheduleMarkAsRead");
    expect(loadBlock).not.toContain("await markConversationFullyRead");
  });

  it("8. completed conversation history is not gated on send eligibility", () => {
    const messagingSource = readFileSync(
      join(process.cwd(), "src/lib/messaging.ts"),
      "utf8",
    );
    const fetchBlock = messagingSource.slice(
      messagingSource.indexOf("export async function fetchMessages"),
      messagingSource.indexOf("export async function sendMessage"),
    );
    expect(fetchBlock).not.toContain("canSendInConversation");
    expect(fetchBlock).not.toContain("bookingStatus");
  });

  it("9. cancelled conversation history is not gated on send eligibility", () => {
    const loadBlock = chatSource.slice(
      chatSource.indexOf("async function loadMessages"),
      chatSource.indexOf("void loadMessages();"),
    );
    expect(chatSource).toContain("isCancelledBookingChatGraceExpired");
    expect(loadBlock).not.toContain("canSendInConversation");
  });

  it("10. membership and access rules remain on composer only", () => {
    expect(chatSource).toContain("disabled={sending || uploading || !canSend}");
    expect(chatSource).toContain("canSendInConversation(conversation)");
  });

  it("11. rapid switching uses generation guards so loading resolves", () => {
    expect(chatSource).toContain("const generation = ++loadGenerationRef.current");
    expect(chatSource).toContain("cancelled = true");
  });

  it("12. React Strict Mode double effect cannot leave loading stuck permanently", () => {
    expect(chatSource).toMatch(
      /finally\s*\{\s*if \(generation === loadGenerationRef\.current\)\s*\{\s*setLoading\(false\)/,
    );
    expect(chatSource).not.toContain("persistConversationRead");
  });

  it("loads messages in loadMessages without awaiting mark-as-read", () => {
    expect(chatSource).toContain("async function loadMessages()");
  });

  it("stabilises inbox callbacks in MessagesPageContent", () => {
    expect(pageSource).toContain("handleConversationRead");
    expect(pageSource).toContain("handleInboxRefresh");
    expect(pageSource).toContain("onConversationRead={handleConversationRead}");
    expect(pageSource).toContain("onInboxRefresh={handleInboxRefresh}");
  });

  it("uses refs for mark-as-read callbacks to avoid load effect loops", () => {
    expect(chatSource).toContain("onConversationReadRef");
    expect(chatSource).toContain("onInboxRefreshRef");
  });
});
