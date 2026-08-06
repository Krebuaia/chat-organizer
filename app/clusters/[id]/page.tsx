import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatDateRange(createdAt: string | null, updatedAt: string | null) {
  if (!createdAt) return null;
  const start = new Date(createdAt);
  const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  if (!updatedAt) return startStr;
  const end = new Date(updatedAt);
  const endStr = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return startStr === endStr ? startStr : `${startStr} – ${endStr}`;
}

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: cluster } = await supabase.from("co_clusters").select("*").eq("id", id).single();
  const { data: conversations } = await supabase
    .from("co_conversations")
    .select("id, title, summary, ideas, source, attachment_count, created_at, updated_at")
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
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{c.title}</h3>
              <span
                className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                  c.source === "chatgpt" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                }`}
              >
                {c.source === "chatgpt" ? "ChatGPT" : "Claude"}
              </span>
              {c.attachment_count > 0 && (
                <span className="text-[10px] text-gray-400">{c.attachment_count} attachment(s)</span>
              )}
              {formatDateRange(c.created_at, c.updated_at) && (
                <span className="text-[10px] text-gray-400">{formatDateRange(c.created_at, c.updated_at)}</span>
              )}
            </div>
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
