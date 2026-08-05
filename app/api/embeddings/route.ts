import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Just a fetch, nothing else. Kept separate and minimal so it can't be the
// slow part of a bigger request.
export async function GET() {
  const { data, error } = await supabase.from("co_conversations").select("id, title, embedding");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data });
}
