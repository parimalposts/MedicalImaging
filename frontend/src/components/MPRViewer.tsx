"use client";
/**
 * Multi-planar reconstruction viewer.
 * Renders backend PNG frames via three labelled viewports.
 * NOTE: Cornerstone.js requires browser APIs — this component must be
 * imported with dynamic({ ssr: false }) in the page.
 */
import { useState } from "react";
import { dicomApi } from "@/lib/api";
import { CornerstoneViewport } from "./CornerstoneViewport";

const PRESETS: Record<string, [number, number]> = {
  "Soft Tissue": [40, 400],
  Bone: [400, 1800],
  Lung: [-600, 1500],
};

interface Props {
  seriesUid: string;
  sliceCount: number;
}

export function MPRViewer({ seriesUid, sliceCount }: Props) {
  const [preset, setPreset] = useState("Soft Tissue");

  const frameUrl = (i: number) => dicomApi.frameUrl(seriesUid, i);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Window preset:</span>
        {Object.keys(PRESETS).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`text-xs px-2 py-1 rounded ${
              preset === p
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {p}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{sliceCount} slices</span>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1" style={{ minHeight: 480 }}>
        {[
          { label: "Axial" },
          { label: "Coronal" },
          { label: "Sagittal" },
          { label: "Overview" },
        ].map(({ label }) => (
          <CornerstoneViewport
            key={label}
            seriesUid={seriesUid}
            sliceCount={sliceCount}
            frameUrlFn={frameUrl}
            label={label}
          />
        ))}
      </div>
    </div>
  );
}
