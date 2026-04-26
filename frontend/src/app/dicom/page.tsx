"use client";
import { useEffect, useState } from "react";
import { dicomApi } from "@/lib/api";
import type { StudyResponse } from "@/types";
import { DicomSeriesList } from "@/components/DicomSeriesList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function DicomPage() {
  const [studies, setStudies] = useState<StudyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dicomApi
      .listStudies()
      .then(setStudies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">DICOM Browser</h1>
      <p className="text-slate-400 text-sm mb-6">
        Studies and series loaded from <code className="text-blue-300">data/dicoms/</code>.
        Click a series to open the multi-planar reconstruction viewer.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400">
          <LoadingSpinner /> Loading studies...
        </div>
      )}
      {error && <p className="text-red-400">Error: {error}</p>}
      {!loading && !error && <DicomSeriesList studies={studies} />}
    </div>
  );
}
