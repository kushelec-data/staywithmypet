import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ChatPanel message loading", () => {
  const chatSource = readFileSync(
    join(process.cwd(), "src/components/messages/ChatPanel.tsx"),
    "utf8",
  );

  it("loads messages in loadMessages without awaiting mark-as-read", () => {
    expect(chatSource).toContain("async function loadMessages()");
    expect(chatSource).toContain("fetchMessages(supabase, conversationId, userId)");

    const loadBlock = chatSource.slice(
      chatSource.indexOf("async function loadMessages"),
      chatSource.indexOf("void loadMessages();"),
    );

    expect(loadBlock).toContain("page.messages");
    expect(loadBlock).toContain("page.hasOlder");
    expect(loadBlock).toContain("} finally {");
    expect(loadBlock).toContain("setLoading(false)");

    const tryFinallyEnd = loadBlock.indexOf("} finally {");
    const markIndex = loadBlock.indexOf("markConversationFullyRead");
    expect(markIndex).toBeGreaterThan(tryFinallyEnd);
  });

  it("always clears loading for the active load generation in finally", () => {
    expect(chatSource).toContain("loadGenerationRef");
    expect(chatSource).toMatch(
      /finally\s*\{\s*if \(generation === loadGenerationRef\.current\)\s*\{\s*setLoading\(false\)/,
    );
  });

  it("logs mark-as-read failures without blocking the thread", () => {
    expect(chatSource).toContain('console.warn("[messages] mark-as-read failed"');
    expect(chatSource).toContain(".catch((err) => {");
  });

  it("uses the selected conversation id for fetchMessages", () => {
    expect(chatSource).toContain("const conversationId = conversation.id");
    expect(chatSource).toContain("fetchMessages(supabase, conversationId, userId)");
  });
});

describe("cancelled booking threads", () => {
  it("does not gate fetchMessages on booking send eligibility", () => {
    const messagingSource = readFileSync(
      join(process.cwd(), "src/lib/messaging.ts"),
      "utf8",
    );
    const fetchBlock = messagingSource.slice(
      messagingSource.indexOf("async function fetchMessagesPageRows"),
      messagingSource.indexOf("export async function fetchMessages"),
    );
    expect(fetchBlock).not.toContain("canSendInConversation");
    expect(fetchBlock).not.toContain("bookingStatus");
  });
});
