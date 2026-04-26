"use client";
import { useEffect, useState } from "react";
import { qaApi, segApi } from "@/lib/api";
import type { AnnotationResponse, QARecordResponse, QAStatus, QAStatsResponse } from "@/types";
import { StatusBadge } from "./ui/StatusBadge";
import { QAReviewCard } from "./QAReviewCard";
import { LoadingSpinner } from "./ui/LoadingSpinner";

const FORMAT_TOOL: Record<string, string> = {
  seg_nrrd: "3D Slicer",
  nii_gz: "ITK-SNAP",
  dicom_seg: "OsiriX/Horos",
};

export function QADashboard() {
  const [records, setRecords] = useState<(QARecordResponse & { filename?: string; format?: string })[]>([]);
  const [stats, setStats] = useState<QAStatsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<QAStatus | "">("");
  const [selected, setSelected] = useState<(QARecordResponse & { filename?: string; format?: string }) | null>(null);
  const [selectedAnn, setSelectedAnn] = useState<AnnotationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [recs, s] = await Promise.all([
      qaApi.list(statusFilter || undefined),
      qaApi.stats(),
    ]);
    setRecords(recs as any);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleSelect = async (rec: any) => {
    setSelected(rec);
    try {
      const ann = await segApi.get(rec.annotation_id);
      setSelectedAnn(ann);
    } catch {
      setSelectedAnn(null);
    }
  };

  const handleReviewed = (updated: QARecordResponse) => {
    setRecords((prev) =>
      prev.map((r) => (r.annotation_id === updated.annotation_id ? { ...r, ...updated } : r))
    );
    if (selected?.annotation_id === updated.annotation_id) {
      setSelected((prev) => prev ? { ...prev, ...updated } : prev);
    }
    qaApi.stats().then(setStats);
  };

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-slate-200" },
            { label: "Pending", value: stats.pending, color: "text-yellow-300" },
            { label: "Approved", value: stats.approved, color: "text-emerald-300" },
            { label: "Rejected", value: stats.rejected, color: "text-red-300" },
            { label: "Flagged", value: stats.flagged, color: "text-orange-300" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">Filter:</span>
        {(["", "pending", "approved", "rejected", "flagged"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? "border-blue-500 bg-blue-900/40 text-blue-300"
                : "border-slate-600 text-slate-400 hover:border-slate-400"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <LoadingSpinner size={16} /> Loading...
            </div>
          )}
          {!loading && records.length === 0 && (
            <p className="text-slate-500 text-sm">No annotations match the filter.</p>
          )}
          {records.map((rec) => (
            <button
              key={rec.id}
              onClick={() => handleSelect(rec)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors
                          ${selected?.id === rec.id
                            ? "border-blue-500 bg-blue-900/30"
                            : "border-slate-700 bg-slate-800 hover:border-slate-500"
                          }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200 truncate">
                  {(rec as any).filename || `Annotation #${rec.annotation_id}`}
                </span>
                <StatusBadge status={rec.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">
                  {FORMAT_TOOL[(rec as any).format] || "Unknown tool"}
                </span>
                {rec.reviewer && (
                  <span className="text-xs text-slate-600">· by {rec.reviewer}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <QAReviewCard
            record={selected}
            annotation={selectedAnn}
            onReviewed={handleReviewed}
          />
        ) : (
          <div className="card flex flex-col items-center justify-center h-64 text-slate-500">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">Select an annotation to review</p>
          </div>
        )}
      </div>
    </div>
  );
}
