"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseExport } from "@/lib/parseExport";

export default function UploadPage() {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setStatus("Reading your export file...");

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const conversations = parseExport(json);

      const errors: string[] = [];
      let processed = 0;

      for (let i = 0; i < conversations.length; i++) {
        setStatus(`Summarizing chat ${i + 1} of ${conversations.length}...`);
        setProgress(Math.round((i / conversations.length) * 70)); // ingest = first 70% of the bar

        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(conversations[i]),
          });
          const data = await res.json();
          if (data.error) errors.push(`${conversations[i].title}: ${data.error}`);
          else processed++;
        } catch (err) {
          errors.push(`${conversations[i].title}: ${(err as Error).message}`);
        }
      }

      if (processed === 0) {
        setStatus(
          `Nothing was saved. First error: ${errors[0] || "unknown"}. Fix this before trying again.`
        );
        setBusy(false);
        return;
      }

      if (errors.length > 0) {
        console.warn(`${errors.length} chats failed:`, errors);
      }

      setStatus(`Summarized ${processed} of ${conversations.length} chats. Grouping into themes...`);
      setProgress(75);

      const assignRes = await fetch("/api/cluster/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const assignData = await assignRes.json();

      if (assignData.error) {
        setStatus(`Error while grouping: ${assignData.error}`);
        setBusy(false);
        return;
      }

      const clusters = assignData.clusters as { id: string; label: string }[];

      for (let i = 0; i < clusters.length; i++) {
        setStatus(`Writing summary ${i + 1} of ${clusters.length} themes...`);
        setProgress(75 + Math.round((i / clusters.length) * 25));

        await fetch("/api/cluster/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clusterId: clusters[i].id }),
        });
      }

      setProgress(100);
      const errorNote = errors.length ? ` (${errors.length} chats had issues and were skipped)` : "";
      setStatus(`Done! Processed ${processed} chats into ${clusters.length} themes${errorNote}. Taking you there now...`);
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
        arrives, unzip it and upload the conversations.json file here.
      </p>

      <label className="block border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-gray-400">
        <input type="file" accept=".json" className="hidden" onChange={handleFile} disabled={busy} />
        <span className="text-gray-500">
          {busy ? "Processing..." : "Click to choose your conversations.json file"}
        </span>
      </label>

      {progress !== null && (
        <div className="w-full bg-gray-100 rounded-full h-2 mt-6">
          <div
            className="bg-black h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
    </main>
  );
}
