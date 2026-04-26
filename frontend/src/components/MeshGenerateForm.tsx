"use client";
import { useEffect, useState } from "react";
import { meshApi, segApi } from "@/lib/api";
import type { AnnotationResponse, ExportFormat, MeshJobResponse } from "@/types";
import { LoadingSpinner } from "./ui/LoadingSpinner";

interface Props {
  onJobCreated: (job: MeshJobResponse) => void;
}

export function MeshGenerateForm({ onJobCreated }: Props) {
  const [annotations, setAnnotations] = useState<AnnotationResponse[]>([]);
  const [annotationId, setAnnotationId] = useState<number | "">("");
  const [labelIndex, setLabelIndex] = useState(1);
  const [smoothing, setSmoothing] = useState(5);
  const [format, setFormat] = useState<ExportFormat>("glb");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    segApi.list().then(setAnnotations);
  }, []);

  const handleGenerate = async () => {
    if (!annotationId) return;
    setError(null);
    setGenerating(true);
    try {
      const job = await meshApi.generate({
        annotation_id: Number(annotationId),
        label_index: labelIndex,
        smoothing_iterations: smoothing,
        export_format: format,
      });
      onJobCreated(job);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const selectedAnn = annotations.find((a) => a.id === annotationId);

  return (
    <div className="card space-y-4">
      <h2 className="text-sm font-semibold text-slate-300">Generate 3D Mesh</h2>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Segmentation</label>
        <select
          value={annotationId}
          onChange={(e) => setAnnotationId(e.target.value ? Number(e.target.value) : "")}
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none"
        >
          <option value="">Select a segmentation...</option>
          {annotations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.filename} ({a.format})
            </option>
          ))}
        </select>
      </div>

      {selectedAnn && (
        <div>
          <label className="text-xs text-slate-400 block mb-1">Label</label>
          <select
            value={labelIndex}
            onChange={(e) => setLabelIndex(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none"
          >
            {selectedAnn.labels.map((l) => (
              <option key={l.label_value} value={l.label_value}>
                {l.name} (#{l.label_value})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-400 block mb-1">
          Laplacian smoothing iterations: {smoothing}
        </label>
        <input
          type="range"
          min={0}
          max={20}
          value={smoothing}
          onChange={(e) => setSmoothing(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Export format</label>
        <div className="flex gap-2">
          {(["glb", "stl", "obj"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                format === f
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              .{f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={!annotationId || generating}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {generating && <LoadingSpinner size={16} />}
        {generating ? "Generating mesh..." : "Generate 3D Mesh"}
      </button>
    </div>
  );
}
