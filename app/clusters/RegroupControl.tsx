"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clusterByThreshold } from "@/lib/clientClustering";

async function safeJson(res: Response): Promise<{ error?: string; [key: string]: unknown }> {
  const text = await res.text();
  if (!text) return { error: `Empty response (HTTP ${res.status}). The request likely timed out.` };
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Non-JSON response (HTTP ${res.status}): ${text.slice(0, 150)}` };
  }
}

export default function RegroupControl() {
  const [threshold, setThreshold] = useState(0.78);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function regroup() {
    setBusy(true);
    setStatus("Fetching your chats...");

    try {
      const embRes = await fetch("/api/embeddings");
      const embData = await safeJson(embRes);
      if (embData.error || !embData.conversations) {
        setStatus(`Error: ${embData.error || "unknown"}`);
        setBusy(false);
        return;
      }

      const allConvos = embData.conversations as { id: string; title: string; embedding: number[] }[];

      setStatus("Grouping by similarity...");
      const assignments = clusterByThreshold(allConvos.map((c) => c.embedding), threshold);

      const groupMap = new Map<number, { id: string; title: string }[]>();
      assignments.forEach((g, idx) => {
        if (!groupMap.has(g)) groupMap.set(g, []);
        groupMap.get(g)!.push(allConvos[idx]);
      });
      const groups = Array.from(groupMap.values()).map((members) => ({
        label: members[0].title,
        memberIds: members.map((m) => m.id),
      }));

      setStatus(`Saving ${groups.length} themes...`);
      const saveRes = await fetch("/api/cluster/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });
      const saveData = await safeJson(saveRes);
      if (saveData.error) {
        setStatus(`Error: ${saveData.error}`);
        setBusy(false);
        return;
      }

      const clusters = saveData.clusters as { id: string; label: string }[];
      for (let i = 0; i < clusters.length; i++) {
        setStatus(`Writing summary ${i + 1} of ${clusters.length} themes...`);
        await fetch("/api/cluster/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clusterId: clusters[i].id }),
        });
      }

      setStatus("Done, refreshing...");
      router.refresh();
      setBusy(false);
    } catch (err) {
      setStatus(`Something went wrong: ${(err as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 mb-8 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">How strictly should chats be grouped?</label>
        <span className="text-xs text-gray-500">{threshold.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0.60"
        max="0.90"
        step="0.01"
        value={threshold}
        onChange={(e) => setThreshold(parseFloat(e.target.value))}
        className="w-full"
        disabled={busy}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Looser: fewer, bigger themes</span>
        <span>Stricter: more, tighter themes</span>
      </div>
      <button
        onClick={regroup}
        disabled={busy}
        className="mt-4 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {busy ? "Regrouping..." : "Re-group my chats"}
      </button>
      {status && <p className="text-xs text-gray-600 mt-2">{status}</p>}
    </div>
  );
}
