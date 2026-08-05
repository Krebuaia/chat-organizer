import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: cluster } = await supabase.from("co_clusters").select("*").eq("id", id).single();
  const { data: conversations } = await supabase
    .from("co_conversations")
    .select("id, title, summary, ideas")
    .eq("cluster_id", id);

  if (!cluster) {
    return <main className="max-w-2xl mx-auto mt-16 px-6">Theme not found.</main>;
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 px-6 pb-24">
      <Link href="/clusters" className="text-sm text-blue-600 hover:underline">
        &larr; All themes
      </Link>

      <h1 className="text-2xl font-semibold mt-4 mb-6">{cluster.label}</h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 whitespace-pre-wrap text-sm leading-relaxed">
        {cluster.synthesis}
      </div>

      <h2 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wide">
        Source conversations ({conversations?.length || 0})
      </h2>

      <div className="grid gap-3">
        {conversations?.map((c) => (
          <div key={c.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-sm">{c.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{c.summary}</p>
            {c.ideas && (
              <p className="text-sm text-amber-700 mt-2">
                <span className="font-medium">Idea nugget: </span>
                {c.ideas}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
