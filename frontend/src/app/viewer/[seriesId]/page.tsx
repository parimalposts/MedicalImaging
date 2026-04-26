"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { dicomApi } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MetadataPanel } from "@/components/MetadataPanel";
import type { DicomTag } from "@/types";

// SSR must be disabled: Cornerstone.js uses window/WebGL/WebWorker
const MPRViewer = dynamic(
  () => import("@/components/MPRViewer").then((m) => ({ default: m.MPRViewer })),
  { ssr: false, loading: () => <div className="flex items-center gap-2 text-slate-400"><LoadingSpinner /> Loading viewer...</div> }
);

export default function ViewerPage({ params }: { params: { seriesId: string } }) {
  const { seriesId } = params;
  const [sliceCount, setSliceCount] = useState(0);
  const [tags, setTags] = useState<DicomTag[]>([]);
  const [showMeta, setShowMeta] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dicomApi.getSliceCount(seriesId),
      dicomApi.getMetadata(seriesId),
    ]).then(([{ count }, tagList]) => {
      setSliceCount(count);
      setTags(tagList);
    }).finally(() => setLoading(false));
  }, [seriesId]);

  return (
    <div className="p-6 flex flex-col gap-4 h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">MPR Viewer</h1>
          <p className="text-xs text-slate-400 font-mono truncate max-w-lg">{seriesId}</p>
        </div>
        <button
          onClick={() => setShowMeta((v) => !v)}
          className="btn-secondary text-xs"
        >
          {showMeta ? "Hide" : "Show"} DICOM Tags
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <LoadingSpinner /> Loading series...
        </div>
      ) : (
        <div className={`flex gap-4 flex-1 overflow-hidden`}>
          <div className={showMeta ? "flex-1" : "w-full"}>
            <MPRViewer seriesUid={seriesId} sliceCount={sliceCount} />
          </div>
          {showMeta && (
            <div className="w-80 card overflow-hidden flex flex-col">
              <h3 className="text-xs font-semibold text-slate-300 mb-2">DICOM Metadata</h3>
              <MetadataPanel tags={tags} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
