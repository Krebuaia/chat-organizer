"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  title: string;
  summary: string;
  ideas: string;
  source: string;
  messageCount: number;
  createdAt: string | null;
  theme: string;
  attachmentCount: number;
};

type SortKey = "title" | "theme" | "source" | "messageCount" | "createdAt";

const PAGE_SIZE = 50;

function toCsvValue(value: string | number) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export default function DataTable({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "claude" | "chatgpt">("all");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const themes = useMemo(() => {
    const set = new Set(rows.map((r) => r.theme));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (themeFilter !== "all" && r.theme !== themeFilter) return false;
      if (q && !`${r.title} ${r.summary} ${r.ideas}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, sourceFilter, themeFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "messageCount") cmp = a.messageCount - b.messageCount;
      else if (sortKey === "createdAt") cmp = (a.createdAt || "").localeCompare(b.createdAt || "");
      else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function exportCsv() {
    const header = ["Title", "Theme", "Source", "Messages", "Date", "Summary", "Idea nugget"];
    const lines = [header.map(toCsvValue).join(",")];
    for (const r of sorted) {
      lines.push(
        [
          toCsvValue(r.title),
          toCsvValue(r.theme),
          toCsvValue(r.source),
          toCsvValue(r.messageCount),
          toCsvValue(r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""),
          toCsvValue(r.summary),
          toCsvValue(r.ideas),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-organizer-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function headerButton(label: string, key: SortKey) {
    return (
      <button
        onClick={() => toggleSort(key)}
        className="flex items-center gap-1 text-left font-medium hover:text-black"
      >
        {label}
        {sortKey === key && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search titles, summaries, ideas..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />

        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value as typeof sourceFilter);
            setPage(0);
          }}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="all">All sources</option>
          <option value="claude">Claude</option>
          <option value="chatgpt">ChatGPT</option>
        </select>

        <select
          value={themeFilter}
          onChange={(e) => {
            setThemeFilter(e.target.value);
            setPage(0);
          }}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm max-w-[220px]"
        >
          <option value="all">All themes</option>
          {themes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          onClick={exportCsv}
          className="ml-auto bg-black text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-800"
        >
          Export CSV
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-2">
        {sorted.length} of {rows.length} chats
      </p>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2">{headerButton("Title", "title")}</th>
              <th className="px-3 py-2">{headerButton("Theme", "theme")}</th>
              <th className="px-3 py-2">{headerButton("Source", "source")}</th>
              <th className="px-3 py-2">{headerButton("Msgs", "messageCount")}</th>
              <th className="px-3 py-2">{headerButton("Date", "createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <>
                <tr
                  key={r.id}
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-3 py-2 max-w-[280px] truncate">{r.title}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate text-gray-600">{r.theme}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        r.source === "chatgpt" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {r.source === "chatgpt" ? "ChatGPT" : "Claude"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.messageCount}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td colSpan={5} className="px-3 py-3 text-sm text-gray-700">
                      <p className="mb-2">{r.summary}</p>
                      {r.ideas && (
                        <p className="text-amber-700">
                          <span className="font-medium">Idea nugget: </span>
                          {r.ideas}
                        </p>
                      )}
                      {r.attachmentCount > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{r.attachmentCount} attachment(s)</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-gray-500">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            disabled={currentPage >= pageCount - 1}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
