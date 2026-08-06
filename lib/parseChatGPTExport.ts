// ChatGPT's export stores each conversation as a tree of nodes (to support
// regenerated responses), not a flat message list like Claude's export.
// This walks from the active branch tip back to the root to get the
// conversation as it was actually read, then reverses it into chronological order.

type ParsedConversation = {
  sourceUuid: string;
  title: string;
  rawText: string;
  messageCount: number;
  createdAt: string | null;
  source: "chatgpt";
  attachmentCount: number;
};

type ChatGPTNode = {
  id: string;
  parent?: string;
  message?: {
    author?: { role?: string };
    content?: { parts?: unknown[] };
  } | null;
};

export function parseChatGPTExport(json: unknown): ParsedConversation[] {
  const conversations = Array.isArray(json) ? json : [];

  const results: ParsedConversation[] = [];

  for (const convo of conversations as Record<string, unknown>[]) {
    const mapping = convo.mapping as Record<string, ChatGPTNode> | undefined;
    const currentNodeId = convo.current_node as string | undefined;
    if (!mapping || !currentNodeId) continue;

    // Walk from the tip of the active branch back to the root
    const chain: ChatGPTNode[] = [];
    let nodeId: string | undefined = currentNodeId;
    const visited = new Set<string>();
    while (nodeId && mapping[nodeId] && !visited.has(nodeId)) {
      visited.add(nodeId);
      const node: ChatGPTNode = mapping[nodeId];
      chain.push(node);
      nodeId = node.parent;
    }
    chain.reverse();

    let attachmentCount = 0;
    const lines: string[] = [];

    for (const node of chain) {
      const message = node.message;
      if (!message || !message.content) continue;
      const role = message.author?.role || "unknown";
      if (role === "system") continue;

      const parts = message.content.parts || [];
      const textParts: string[] = [];
      for (const part of parts) {
        if (typeof part === "string") {
          if (part.trim()) textParts.push(part);
        } else if (part && typeof part === "object") {
          attachmentCount++;
          textParts.push("[attached file or image]");
        }
      }
      if (textParts.length > 0) {
        lines.push(`${role}: ${textParts.join(" ")}`);
      }
    }

    const rawText = lines.join("\n\n");
    if (!rawText.trim()) continue;

    results.push({
      sourceUuid: (convo.id as string) || (convo.conversation_id as string) || crypto.randomUUID(),
      title: (convo.title as string) || "Untitled ChatGPT conversation",
      rawText,
      messageCount: lines.length,
      createdAt: convo.create_time ? new Date((convo.create_time as number) * 1000).toISOString() : null,
      source: "chatgpt",
      attachmentCount,
    });
  }

  return results;
}
