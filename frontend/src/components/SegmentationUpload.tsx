"use client";
import { useRef, useState } from "react";
import { segApi } from "@/lib/api";
import type { AnnotationResponse } from "@/types";
import { LoadingSpinner } from "./ui/LoadingSpinner";

export function SegmentationUpload({
  onUploaded,
}: {
  onUploaded: (ann: AnnotationResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const ann = await segApi.upload(file);
      onUploaded(ann);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                    ${dragging ? "border-blue-400 bg-blue-900/20" : "border-slate-600 hover:border-slate-400"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size={32} />
            <p className="text-slate-400 text-sm">Uploading and parsing...</p>
          </div>
        ) : (
          <>
            <p className="text-3xl mb-2">🧩</p>
            <p className="text-slate-300 font-medium">
              Drop a segmentation file or click to browse
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Supported: <code>.seg.nrrd</code> (3D Slicer) · <code>.nii.gz</code> (ITK-SNAP) ·{" "}
              <code>.dcm</code> (OsiriX/Horos DICOM SEG)
            </p>
          </>
        )}
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".nrrd,.nii,.gz,.dcm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
