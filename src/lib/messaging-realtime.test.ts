import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ChatPanel realtime subscription stability", () => {
  const chatSource = readFileSync(
    join(process.cwd(), "src/components/messages/ChatPanel.tsx"),
    "utf8",
  );

  it("keeps realtime subscription deps to conversationId, supabase, and userId only", () => {
    const subscribeBlock = chatSource.slice(
      chatSource.indexOf("subscribeToConversationMessages(supabase, conversationId, userId"),
      chatSource.indexOf("void supabase.removeChannel(channel)"),
    );

    expect(subscribeBlock).toContain("onConversationReadRef");
    expect(subscribeBlock).not.toContain("onConversationRead?.()");
    expect(subscribeBlock).not.toContain("onConversationRead()");
  });

  it("does not include onConversationRead in subscription effect dependency array", () => {
    const effectStart = chatSource.lastIndexOf("subscribeToConversationMessages(supabase, conversationId, userId");
    const effectBlock = chatSource.slice(effectStart, effectStart + 800);
    expect(effectBlock).toMatch(/\}, \[conversationId, supabase, userId\]\);/);
  });

  it("uses refs so parent re-renders do not recreate subscriptions", () => {
    expect(chatSource).toContain("const onConversationReadRef = useRef(onConversationRead)");
    expect(chatSource).toContain("onConversationReadRef.current = onConversationRead");
    expect(chatSource).toContain("const conversationRef = useRef(conversation)");
  });
});
