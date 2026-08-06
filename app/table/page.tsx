import Link from "next/link";
import { supabase } from "@/lib/supabase";
import DataTable from "./DataTable";

export const dynamic = "force-dynamic";

export default async function TablePage() {
  const { data: conversations } = await supabase
    .from("co_conversations")
    .select("id, title, summary, ideas, source, message_count, created_at, cluster_id, attachment_count")
    .order("created_at", { ascending: false });

  const { data: clusters } = await supabase.from("co_clusters").select("id, label");

  const clusterLabelById = new Map((clusters || []).map((c) => [c.id, c.label]));

  const rows = (conversations || []).map((c) => ({
    id: c.id,
    title: c.title || "Untitled",
    summary: c.summary || "",
    ideas: c.ideas || "",
    source: c.source || "claude",
    messageCount: c.message_count || 0,
    createdAt: c.created_at,
    theme: c.cluster_id ? clusterLabelById.get(c.cluster_id) || "Uncategorized" : "Uncategorized",
    attachmentCount: c.attachment_count || 0,
  }));

  return (
    <main className="max-w-6xl mx-auto mt-12 px-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">All chats</h1>
        <Link href="/clusters" className="text-sm text-blue-600 hover:underline">
          Back to themes
        </Link>
      </div>

      <DataTable rows={rows} />
    </main>
  );
}
