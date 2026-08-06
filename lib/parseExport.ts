// Anthropic's account export is a JSON array of conversations. The exact field
// names have shifted slightly across export versions, so this reads a few
// possible shapes defensively rather than assuming one fixed schema.

type ParsedConversation = {
  sourceUuid: string;
  title: string;
  rawText: string;
  messageCount: number;
  createdAt: string | null;
  source: "claude";
  attachmentCount: number;
};

export function parseExport(json: unknown): ParsedConversation[] {
  const conversations = Array.isArray(json) ? json : (json as { conversations?: unknown[] })?.conversations ?? [];

  return (conversations as Record<string, unknown>[])
    .map((convo) => {
      const messages =
        (convo.chat_messages as Record<string, unknown>[]) ||
        (convo.messages as Record<string, unknown>[]) ||
        [];

      const rawText = messages
        .map((m) => {
          const sender = (m.sender as string) || (m.role as string) || "unknown";
          const text =
            (m.text as string) ||
            (typeof m.content === "string" ? m.content : "") ||
            (Array.isArray(m.content)
              ? (m.content as Record<string, unknown>[])
                  .map((c) => (c.text as string) || "")
                  .join(" ")
              : "");
          return `${sender}: ${text}`;
        })
        .join("\n\n");

      return {
        sourceUuid: (convo.uuid as string) || (convo.id as string) || crypto.randomUUID(),
        title: (convo.name as string) || (convo.title as string) || "Untitled conversation",
        rawText,
        messageCount: messages.length,
        createdAt: (convo.created_at as string) || null,
        source: "claude" as const,
        attachmentCount: 0,
      };
    })
    .filter((c) => c.rawText.trim().length > 0);
}
