import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Accepts groups already computed in the browser: [{ label, memberIds: [...] }]
// Only responsible for writing to the database, nothing else.
export async function POST(req: NextRequest) {
  const { groups } = await req.json() as { groups: { label: string; memberIds: string[] }[] };

  if (!groups || groups.length === 0) {
    return NextResponse.json({ error: "No groups provided." }, { status: 400 });
  }

  await supabase.from("co_clusters").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: insertedClusters, error: insertError } = await supabase
    .from("co_clusters")
    .insert(
      groups.map((g) => ({
        label: g.label,
        synthesis: "",
        conversation_count: g.memberIds.length,
      }))
    )
    .select();

  if (insertError || !insertedClusters) {
    return NextResponse.json({ error: `Failed to create clusters: ${insertError?.message}` }, { status: 500 });
  }

  await Promise.all(
    groups.map((g, i) =>
      supabase.from("co_conversations").update({ cluster_id: insertedClusters[i].id }).in("id", g.memberIds)
    )
  );

  const clusterResults = groups.map((g, i) => ({
    id: insertedClusters[i].id,
    label: insertedClusters[i].label,
  }));

  return NextResponse.json({ clusters: clusterResults });
}
