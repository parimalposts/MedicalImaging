"use client";
import { useEffect, useState } from "react";
import { segApi } from "@/lib/api";
import type { AnnotationResponse } from "@/types";
import { SegmentationUpload } from "@/components/SegmentationUpload";
import { SegmentationLabels } from "@/components/SegmentationLabels";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SegmentationPage() {
  const [annotations, setAnnotations] = useState<AnnotationResponse[]>([]);
  const [selected, setSelected] = useState<AnnotationResponse | null>(null);
  const [sliceIdx, setSliceIdx] = useState(16);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    segApi.list().then(setAnnotations).finally(() => setLoading(false));
  }, []);

  const handleUploaded = (ann: AnnotationResponse) => {
    setAnnotations((prev) => [ann, ...prev]);
    setSelected(ann);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Segmentation Manager</h1>
      <p className="text-slate-400 text-sm mb-6">
        Upload segmentations from any tool. Format is auto-detected and labels
        extracted from embedded metadata.
      </p>

      <SegmentationUpload onUploaded={handleUploaded} />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Annotations ({annotations.length})
          </h2>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <LoadingSpinner size={16} /> Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {annotations.map((ann) => (
                <button
                  key={ann.id}
                  onClick={() => setSelected(ann)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors
                              ${selected?.id === ann.id
                                ? "border-blue-500 bg-blue-900/30"
                                : "border-slate-700 bg-slate-800 hover:border-slate-500"
                              }`}
                >
                  <p className="text-sm text-slate-200 truncate">{ann.filename}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ann.label_count} labels · {ann.format.replace("_", ".")}
                  </p>
                </button>
              ))}
              {!annotations.length && (
                <p className="text-slate-500 text-sm">No segmentations yet.</p>
              )}
            </div>
          )}
        </div>

        {selected && (
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Labels</h2>
              <SegmentationLabels labels={selected.labels} format={selected.format} />
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-300">Slice Preview</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Slice:</span>
                  <input
                    type="range"
                    min={0}
                    max={63}
                    value={sliceIdx}
                    onChange={(e) => setSliceIdx(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-xs text-slate-400">{sliceIdx}</span>
                </div>
              </div>
              <img
                key={`${selected.id}-${sliceIdx}`}
                src={segApi.sliceUrl(selected.id, "axial", sliceIdx)}
                alt="Segmentation slice"
                className="w-full rounded bg-black"
                style={{ imageRendering: "pixelated", maxHeight: 300, objectFit: "contain" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
