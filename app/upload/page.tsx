"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseExport } from "@/lib/parseExport";
import { parseChatGPTExport } from "@/lib/parseChatGPTExport";
import { kmeans } from "@/lib/clientKmeans";

// ChatGPT's export has a "mapping" field on each conversation; Claude's doesn't.
function detectSource(json: unknown): "claude" | "chatgpt" {
  const first = Array.isArray(json) ? json[0] : null;
  return first && typeof first === "object" && "mapping" in first ? "chatgpt" : "claude";
}

// Reads a fetch Response safely. If the server returned an empty body, a
// timeout page, or non-JSON, this returns a readable error instead of
// throwing "Unexpected end of JSON input" and killing the whole run.
async function safeJson(res: Response): Promise<{ error?: string; [key: string]: unknown }> {
  const text = await res.text();
  if (!text) {
    return { error: `Empty response (HTTP ${res.status}). The request likely timed out.` };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Non-JSON response (HTTP ${res.status}): ${text.slice(0, 150)}` };
  }
}

export default function UploadPage() {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const router = useRouter();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBusy(true);
    setStatus(`Reading ${files.length} file(s)...`);

    try {
      type Parsed = {
        sourceUuid: string;
        title: string;
        rawText: string;
        messageCount: number;
        createdAt: string | null;
        source: "claude" | "chatgpt";
        attachmentCount: number;
      };
      let conversations: Parsed[] = [];

      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        setStatus(`Reading file ${f + 1} of ${files.length} (${file.name})...`);
        const text = await file.text();
        const json = JSON.parse(text);
        const source = detectSource(json);
        const parsed = source === "chatgpt" ? parseChatGPTExport(json) : parseExport(json);
        conversations = conversations.concat(parsed);
      }

      setStatus(`Found ${conversations.length} total chats across ${files.length} file(s)...`);

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
          const data = await safeJson(res);
          if (data.error) errors.push(`${conversations[i].title}: ${data.error}`);
          else processed++; // covers both freshly processed and already-ingested (skipped) chats
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

      setStatus(`Summarized ${processed} of ${conversations.length} chats. Fetching data for grouping...`);
      setProgress(75);

      const embRes = await fetch("/api/embeddings");
      const embData = await safeJson(embRes);

      if (embData.error || !embData.conversations) {
        setStatus(`Error while fetching data for grouping: ${embData.error || "unknown"}`);
        setBusy(false);
        return;
      }

      const allConvos = embData.conversations as { id: string; title: string; embedding: number[] }[];

      setStatus("Grouping your chats into themes...");
      setProgress(82);

      const k = Math.max(3, Math.round(allConvos.length / 8));
      const assignments = kmeans(
        allConvos.map((c) => c.embedding),
        k
      );

      const groups: { label: string; memberIds: string[] }[] = [];
      for (let i = 0; i < k; i++) {
        const members = allConvos.filter((_, idx) => assignments[idx] === i);
        if (members.length === 0) continue;
        groups.push({ label: members[0].title, memberIds: members.map((m) => m.id) });
      }

      const saveRes = await fetch("/api/cluster/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups }),
      });
      const assignData = await safeJson(saveRes);

      if (assignData.error) {
        setStatus(`Error while saving groups: ${assignData.error}`);
        setBusy(false);
        return;
      }

      const clusters = assignData.clusters as { id: string; label: string }[];
      const synthesisErrors: string[] = [];

      for (let i = 0; i < clusters.length; i++) {
        setStatus(`Writing summary ${i + 1} of ${clusters.length} themes...`);
        setProgress(75 + Math.round((i / clusters.length) * 25));

        try {
          const res = await fetch("/api/cluster/synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clusterId: clusters[i].id }),
          });
          const data = await safeJson(res);
          if (data.error) synthesisErrors.push(`${clusters[i].label}: ${data.error}`);
        } catch (err) {
          synthesisErrors.push(`${clusters[i].label}: ${(err as Error).message}`);
        }
      }

      if (synthesisErrors.length > 0) {
        console.warn(`${synthesisErrors.length} theme summaries failed:`, synthesisErrors);
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
      <h1 className="text-2xl font-semibold mb-2">Upload your export</h1>
      <p className="text-gray-600 mb-8">
        Works with Claude and ChatGPT exports, auto-detected per file. You can
        select multiple files at once, e.g. if your export was split into
        several conversations-XXX.json files. For Claude: Settings &gt; Privacy
        &gt; Export data. For ChatGPT: Settings &gt; Data controls &gt; Export
        data.
      </p>

      <label className="block border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-gray-400">
        <input type="file" accept=".json" multiple className="hidden" onChange={handleFiles} disabled={busy} />
        <span className="text-gray-500">
          {busy ? "Processing..." : "Click to choose one or more conversations.json files"}
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
