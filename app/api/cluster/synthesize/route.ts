import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { synthesizeCluster } from "@/lib/anthropic";

// Writes the synthesis for exactly ONE cluster per call, so each request
// only needs a single Claude API call and stays fast.

export async function POST(req: NextRequest) {
  const { clusterId } = await req.json();

  const { data: members } = await supabase
    .from("co_conversations")
    .select("summary, title")
    .eq("cluster_id", clusterId);

  if (!members || members.length === 0) {
    return NextResponse.json({ error: "No conversations found for this cluster." }, { status: 400 });
  }

  const synthesis = await synthesizeCluster(members.map((m) => m.summary || m.title));

  await supabase.from("co_clusters").update({ synthesis }).eq("id", clusterId);

  return NextResponse.json({ synthesis });
}
