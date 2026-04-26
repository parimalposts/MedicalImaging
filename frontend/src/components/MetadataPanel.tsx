"use client";
import { useState } from "react";
import type { DicomTag } from "@/types";

export function MetadataPanel({ tags }: { tags: DicomTag[] }) {
  const [filter, setFilter] = useState("");
  const visible = tags.filter(
    (t) =>
      !filter ||
      t.keyword.toLowerCase().includes(filter.toLowerCase()) ||
      t.value.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <input
        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm
                   text-slate-200 placeholder-slate-500 mb-3 outline-none focus:border-blue-500"
        placeholder="Filter tags..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="overflow-y-auto flex-1 text-xs font-mono space-y-px">
        {visible.map((t) => (
          <div key={t.tag} className="flex gap-2 hover:bg-slate-700/50 rounded px-1 py-0.5">
            <span className="text-slate-500 shrink-0 w-24">{t.tag}</span>
            <span className="text-blue-300 shrink-0 w-40">{t.keyword}</span>
            <span className="text-slate-400 shrink-0 w-8">{t.vr}</span>
            <span className="text-slate-200 truncate">{t.value}</span>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-slate-500 text-center py-4">No matching tags</p>
        )}
      </div>
    </div>
  );
}
