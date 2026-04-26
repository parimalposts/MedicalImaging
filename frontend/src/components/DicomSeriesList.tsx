"use client";
import Link from "next/link";
import type { StudyResponse } from "@/types";

export function DicomSeriesList({ studies }: { studies: StudyResponse[] }) {
  if (!studies.length)
    return (
      <p className="text-slate-500 text-sm">
        No DICOM studies found. Run{" "}
        <code className="text-blue-300">bash scripts/download_sample_data.sh</code>{" "}
        to load sample data.
      </p>
    );

  return (
    <div className="space-y-6">
      {studies.map((study) => (
        <div key={study.study_uid} className="card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-white">
                {study.patient_name || "Unknown Patient"}
              </p>
              <p className="text-xs text-slate-400">
                ID: {study.patient_id} · Date: {study.study_date || "—"} ·{" "}
                {study.study_description || "No description"}
              </p>
            </div>
            <span className="badge bg-blue-900/40 text-blue-300 border border-blue-700">
              {study.modality || "CT"}
            </span>
          </div>
          <div className="space-y-2">
            {study.series.map((s) => (
              <Link
                key={s.series_uid}
                href={`/viewer/${s.series_uid}`}
                className="flex items-center justify-between bg-slate-900 rounded-lg px-4 py-2
                           hover:bg-slate-700 transition-colors"
              >
                <div>
                  <p className="text-sm text-slate-200">
                    {s.series_description || "Unnamed series"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.num_slices} slices · {s.modality}
                  </p>
                </div>
                <span className="text-blue-400 text-sm">View MPR →</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
