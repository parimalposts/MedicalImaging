"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { meshApi } from "@/lib/api";
import type { MeshJobResponse } from "@/types";
import { MeshGenerateForm } from "@/components/MeshGenerateForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const MeshViewer = dynamic(
  () => import("@/components/MeshViewer").then((m) => ({ default: m.MeshViewer })),
  { ssr: false, loading: () => <div className="flex items-center gap-2 text-slate-400 p-8"><LoadingSpinner />Loading 3D viewer...</div> }
);

export default function MeshPage() {
  const [jobs, setJobs] = useState<MeshJobResponse[]>([]);
  const [selected, setSelected] = useState<MeshJobResponse | null>(null);

  useEffect(() => {
    meshApi.listJobs().then(setJobs);
  }, []);

  const handleJobCreated = (job: MeshJobResponse) => {
    setJobs((prev) => [job, ...prev]);
    if (job.status === "done") setSelected(job);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">3D Asset Generation</h1>
      <p className="text-slate-400 text-sm mb-6">
        Convert segmentation masks to 3D meshes via marching cubes.
        Gaussian pre-smoothing and Laplacian polish produce clean assets
        suitable for AI training or rendering.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <MeshGenerateForm onJobCreated={handleJobCreated} />

          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Previous Jobs ({jobs.length})
            </h2>
            <div className="space-y-2">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => job.status === "done" && setSelected(job)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors
                    ${selected?.id === job.id
                      ? "border-blue-500 bg-blue-900/30"
                      : "border-slate-700 bg-slate-800 hover:border-slate-500"
                    } ${job.status !== "done" ? "opacity-60 cursor-default" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-200 truncate">
                      Job #{job.id} · Label {job.label_index}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        job.status === "done"
                          ? "bg-emerald-900/50 text-emerald-300"
                          : job.status === "error"
                          ? "bg-red-900/50 text-red-300"
                          : "bg-yellow-900/50 text-yellow-300"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    .{job.export_format.toUpperCase()} · smooth={job.smoothing_iterations}
                  </p>
                  {job.error_message && (
                    <p className="text-xs text-red-400 mt-1 truncate">{job.error_message}</p>
                  )}
                </button>
              ))}
              {!jobs.length && (
                <p className="text-slate-500 text-sm">No mesh jobs yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected && selected.status === "done" ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-300">
                  Mesh Preview — Job #{selected.id}
                </h2>
                <a
                  href={meshApi.downloadUrl(selected.id)}
                  download
                  className="btn-secondary text-xs"
                >
                  Download .{selected.export_format.toUpperCase()}
                </a>
              </div>
              <MeshViewer
                downloadUrl={meshApi.downloadUrl(selected.id)}
                format={selected.export_format}
              />
              <p className="text-xs text-slate-500 mt-2">
                Orbit: drag · Zoom: scroll · Pan: right-click drag. Triangle
                count shown in top-right Stats overlay.
              </p>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center h-80 text-slate-500">
              <p className="text-4xl mb-3">🔷</p>
              <p className="text-sm">Generate a mesh to see the 3D viewer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
