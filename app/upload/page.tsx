"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatus("Reading your export file...");

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      setStatus("Summarizing your conversations with Claude (this can take a few minutes for 100 chats)...");
      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const ingestData = await ingestRes.json();

      if (ingestData.errors?.length) {
        setStatus(`Processed ${ingestData.processed}/${ingestData.total}, with ${ingestData.errors.length} errors. Continuing to clustering...`);
      } else {
        setStatus(`Processed ${ingestData.processed}/${ingestData.total} conversations. Now grouping into themes...`);
      }

      const clusterRes = await fetch("/api/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const clusterData = await clusterRes.json();

      if (clusterData.error) {
        setStatus(`Error while clustering: ${clusterData.error}`);
        setBusy(false);
        return;
      }

      setStatus(`Done! Found ${clusterData.clusters.length} themes. Taking you there now...`);
      setTimeout(() => router.push("/clusters"), 1500);
    } catch (err) {
      setStatus(`Something went wrong: ${(err as Error).message}`);
      setBusy(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto mt-24 px-6">
      <h1 className="text-2xl font-semibold mb-2">Upload your Claude export</h1>
      <p className="text-gray-600 mb-8">
        In claude.ai, go to Settings &gt; Privacy &gt; Export data. Once the email
        arrives, unzip it and upload the .json file here.
      </p>

      <label className="block border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-gray-400">
        <input type="file" accept=".json" className="hidden" onChange={handleFile} disabled={busy} />
        <span className="text-gray-500">
          {busy ? "Processing..." : "Click to choose your conversations.json file"}
        </span>
      </label>

      {status && <p className="mt-6 text-sm text-gray-700">{status}</p>}
    </main>
  );
}
