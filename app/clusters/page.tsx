import Link from "next/link";
import { supabase } from "@/lib/supabase";
import RegroupControl from "./RegroupControl";

export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  const { data: clusters } = await supabase
    .from("co_clusters")
    .select("*")
    .order("conversation_count", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto mt-16 px-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Your themes</h1>
        <Link href="/upload" className="text-sm text-blue-600 hover:underline">
          Upload more chats
        </Link>
      </div>

      <RegroupControl />

      {(!clusters || clusters.length === 0) && (
        <p className="text-gray-500">
          No themes yet. <Link href="/upload" className="text-blue-600 hover:underline">Upload your export</Link> to get started.
        </p>
      )}

      <div className="grid gap-4">
        {clusters?.map((cluster) => (
          <Link
            key={cluster.id}
            href={`/clusters/${cluster.id}`}
            className="block border border-gray-200 rounded-lg p-5 hover:border-gray-400 transition"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{cluster.label}</h2>
              <span className="text-xs text-gray-400">{cluster.conversation_count} chats</span>
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{cluster.synthesis}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
