import { NextRequest, NextResponse } from "next/server";
import { parseExport } from "@/lib/parseExport";
import { summarizeConversation } from "@/lib/anthropic";
import { embedText } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300; // allow up to 5 minutes for larger batches

export async function POST(req: NextRequest) {
  const body = await req.json();
  const conversations = parseExport(body);

  let processed = 0;
  const errors: string[] = [];

  for (const convo of conversations) {
    try {
      const { data: existing } = await supabase
        .from("co_conversations")
        .select("id")
        .eq("source_uuid", convo.sourceUuid)
        .maybeSingle();

      if (existing) continue; // skip ones we've already processed

      const { topic, summary, ideas } = await summarizeConversation(convo.rawText);
      const embedding = await embedText(`${topic}. ${summary}`);

      await supabase.from("co_conversations").insert({
        source_uuid: convo.sourceUuid,
        title: convo.title,
        raw_text: convo.rawText.slice(0, 50000),
        summary,
        ideas,
        message_count: convo.messageCount,
        created_at: convo.createdAt,
        embedding,
      });

      processed += 1;
    } catch (err) {
      errors.push(`${convo.title}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    total: conversations.length,
    processed,
    errors,
  });
}
