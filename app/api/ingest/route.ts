import { NextRequest, NextResponse } from "next/server";
import { summarizeConversation } from "@/lib/anthropic";
import { embedText } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";

// Processes exactly ONE conversation per call. Kept intentionally small so it
// finishes well within Netlify's function time limit, even on the free tier.

export async function POST(req: NextRequest) {
  const convo = await req.json();

  try {
    const { data: existing } = await supabase
      .from("co_conversations")
      .select("id")
      .eq("source_uuid", convo.sourceUuid)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ skipped: true });
    }

    const { topic, summary, ideas } = await summarizeConversation(convo.rawText);
    const embedding = await embedText(`${topic}. ${summary}`);

    const { error: insertError } = await supabase.from("co_conversations").insert({
      source_uuid: convo.sourceUuid,
      title: convo.title,
      raw_text: convo.rawText.slice(0, 50000),
      summary,
      ideas,
      message_count: convo.messageCount,
      created_at: convo.createdAt,
      embedding,
    });

    if (insertError) {
      return NextResponse.json({ error: `Database insert failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ processed: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
