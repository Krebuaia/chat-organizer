import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Fast, no external API calls: groups conversations by embedding similarity
// and returns the groups. Synthesis text is filled in afterward, one cluster
// at a time, by /api/cluster/synthesize.

function distance(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function kmeans(points: number[][], k: number, iterations = 15) {
  let centroids = points.slice(0, k);
  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    assignments = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, i) => {
        const d = distance(p, c);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    });

    centroids = centroids.map((_, i) => {
      const members = points.filter((_, idx) => assignments[idx] === i);
      if (members.length === 0) return centroids[i];
      const dims = members[0].length;
      const avg = new Array(dims).fill(0);
      members.forEach((m) => m.forEach((v, d) => (avg[d] += v / members.length)));
      return avg;
    });
  }

  return assignments;
}

export async function POST(req: NextRequest) {
  const { targetClusters } = await req.json();

  const { data: conversations, error } = await supabase
    .from("co_conversations")
    .select("id, title");
  const { data: withEmbeddings } = await supabase
    .from("co_conversations")
    .select("id, embedding");

  if (error || !conversations || conversations.length === 0) {
    return NextResponse.json({ error: "No conversations found. Run ingest first." }, { status: 400 });
  }

  const embeddingById = new Map((withEmbeddings || []).map((c) => [c.id, c.embedding as unknown as number[]]));
  const embeddings = conversations.map((c) => embeddingById.get(c.id)!);

  const k = Math.min(targetClusters || Math.max(3, Math.round(conversations.length / 6)), conversations.length);
  const assignments = kmeans(embeddings, k);

  // Clear old clusters before creating new ones
  await supabase.from("co_clusters").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const clusterResults = [];

  for (let i = 0; i < k; i++) {
    const members = conversations.filter((_, idx) => assignments[idx] === i);
    if (members.length === 0) continue;

    const { data: cluster } = await supabase
      .from("co_clusters")
      .insert({
        label: members[0].title,
        synthesis: "",
        conversation_count: members.length,
      })
      .select()
      .single();

    await supabase
      .from("co_conversations")
      .update({ cluster_id: cluster!.id })
      .in("id", members.map((m) => m.id));

    clusterResults.push({ id: cluster!.id, label: cluster!.label });
  }

  return NextResponse.json({ clusters: clusterResults });
}
