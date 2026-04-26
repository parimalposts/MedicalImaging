"use client";
import { useState } from "react";
import { qaApi, segApi } from "@/lib/api";
import type { AnnotationResponse, QARecordResponse, QAStatus } from "@/types";
import { StatusBadge } from "./ui/StatusBadge";
import { LoadingSpinner } from "./ui/LoadingSpinner";

interface Props {
  record: QARecordResponse & { filename?: string; format?: string };
  annotation: AnnotationResponse | null;
  onReviewed: (updated: QARecordResponse) => void;
}

const ACTIONS: { status: QAStatus; label: string; color: string }[] = [
  { status: "approved", label: "Approve", color: "bg-emerald-700 hover:bg-emerald-600 text-white" },
  { status: "rejected", label: "Reject", color: "bg-red-800 hover:bg-red-700 text-white" },
  { status: "flagged", label: "Flag for Review", color: "bg-orange-800 hover:bg-orange-700 text-white" },
  { status: "pending", label: "Reset to Pending", color: "bg-slate-700 hover:bg-slate-600 text-slate-200" },
];

export function QAReviewCard({ record, annotation, onReviewed }: Props) {
  const [reviewer, setReviewer] = useState(record.reviewer || "");
  const [notes, setNotes] = useState(record.reviewer_notes || "");
  const [loading, setLoading] = useState(false);
  const [sliceIdx, setSliceIdx] = useState(16);

  const handleAction = async (status: QAStatus) => {
    if (!reviewer.trim()) return alert("Please enter your name as reviewer.");
    setLoading(true);
    try {
      const updated = await qaApi.review(record.annotation_id, { status, reviewer, notes });
      onReviewed(updated);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-white text-sm">
            {record.filename || `Annotation #${record.annotation_id}`}
          </p>
          <p className="text-xs text-slate-400">{record.format?.replace("_", ".")} · ID {record.annotation_id}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {annotation && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">Slice preview (axial {sliceIdx})</p>
            <input
              type="range"
              min={0}
              max={63}
              value={sliceIdx}
              onChange={(e) => setSliceIdx(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <img
            key={`${annotation.id}-${sliceIdx}`}
            src={segApi.sliceUrl(annotation.id, "axial", sliceIdx)}
            alt="Segmentation preview"
            className="w-full rounded bg-black"
            style={{ imageRendering: "pixelated", maxHeight: 200, objectFit: "contain" }}
          />
        </div>
      )}

      <div>
        <label className="text-xs text-slate-400 block mb-1">Reviewer name</label>
        <input
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="Your name..."
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional review notes..."
          rows={3}
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ status, label, color }) => (
          <button
            key={status}
            onClick={() => handleAction(status)}
            disabled={loading}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${color} disabled:opacity-50 flex items-center justify-center gap-1`}
          >
            {loading && <LoadingSpinner size={12} />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
