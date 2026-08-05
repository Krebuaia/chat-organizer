import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Turns one raw conversation into a short summary + any standalone ideas it contains.
export async function summarizeConversation(rawText: string) {
  const truncated = rawText.slice(0, 12000); // keep each call fast enough to avoid function timeouts

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Read this Claude conversation and respond ONLY with valid JSON (no markdown fences, no preamble) in this exact shape:

{
  "topic": "one short phrase for what this chat is about",
  "summary": "2-3 sentence summary of what was discussed and decided",
  "ideas": "any standalone ideas, tools, or concepts mentioned that could become their own project — or empty string if none"
}

Conversation:
${truncated}`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("");

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { topic: "Unparsed", summary: text.slice(0, 300), ideas: "" };
  }
}

// Given a group of related conversation summaries, writes a unified brief.
export async function synthesizeCluster(summaries: string[]) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `These are summaries of several related Claude conversations from the same person. Write a short brief with these sections:

1. **Unified concept** — what single idea or project connects these chats
2. **What's already been figured out** — pull from across the summaries
3. **What's missing** — gaps, unanswered questions, unfinished parts
4. **Suggested next step** — one concrete, doable action

Keep it under 250 words total. Plain text, no JSON.

Summaries:
${summaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("");
}
