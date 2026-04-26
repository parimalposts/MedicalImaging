"use client";
import type { LabelInfo, SegFormat } from "@/types";

const FORMAT_BADGES: Record<SegFormat, { label: string; color: string }> = {
  seg_nrrd: { label: "3D Slicer (.seg.nrrd)", color: "bg-blue-900/50 text-blue-300 border-blue-700" },
  nii_gz: { label: "ITK-SNAP (.nii.gz)", color: "bg-violet-900/50 text-violet-300 border-violet-700" },
  dicom_seg: { label: "OsiriX/Horos (DICOM SEG)", color: "bg-teal-900/50 text-teal-300 border-teal-700" },
};

export function SegmentationLabels({
  labels,
  format,
}: {
  labels: LabelInfo[];
  format: SegFormat;
}) {
  const badge = FORMAT_BADGES[format];
  return (
    <div>
      <span className={`badge border ${badge.color} mb-3 inline-block`}>{badge.label}</span>
      <div className="space-y-1">
        {labels.map((l) => {
          const [r, g, b] = l.color_rgb
            ? l.color_rgb.map((c) => Math.round(c * 255))
            : [180, 100, 220];
          return (
            <div key={l.label_value} className="flex items-center gap-3 py-1">
              <div
                className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                style={{ backgroundColor: `rgb(${r},${g},${b})` }}
              />
              <span className="text-sm text-slate-200">{l.name}</span>
              <span className="ml-auto text-xs text-slate-500">#{l.label_value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
