import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Just a fetch, nothing else. Kept separate and minimal so it can't be the
// slow part of a bigger request.
export async function GET() {
  const { data, error } = await supabase.from("co_conversations").select("id, title, embedding");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // pgvector columns come back from Supabase as a text string like "[0.1,-0.2,...]",
  // not a real array, so this needs to be parsed before it can be used for math.
  const conversations = (data || []).map((c) => ({
    ...c,
    embedding: typeof c.embedding === "string" ? JSON.parse(c.embedding) : c.embedding,
  }));

  return NextResponse.json({ conversations });
}
