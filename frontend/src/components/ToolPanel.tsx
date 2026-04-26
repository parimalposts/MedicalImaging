"use client";
import { useState } from "react";

const TOOLS = ["3D Slicer", "ITK-SNAP", "OsiriX / Horos"] as const;
type Tool = (typeof TOOLS)[number];

const SLICER_NRRD_SNIPPET = `# 3D Slicer outputs .seg.nrrd with custom metadata embedded in the header.
# SimpleITK handles pixel data; custom attrs require raw header parsing.

def _parse_nrrd_custom_attrs(path: str) -> dict:
    attrs = {}
    with open(path, "rb") as f:
        header_bytes, prev = b"", b""
        while True:
            chunk = f.read(1)
            if not chunk: break
            header_bytes += chunk
            if prev + chunk == b"\\n\\n": break
            prev = chunk
    for line in header_bytes.decode().splitlines():
        if ":=" in line:
            key, _, val = line.partition(":=")
            attrs[key.strip()] = val.strip()
    return attrs

# Result for a brain segmentation:
# {
#   "Segment0_Name": "Whole Tumor",
#   "Segment0_Color": "0.9 0.2 0.2",
#   "Segment0_LabelValue": "1",
#   "Segment1_Name": "Tumor Core",
#   "Segment1_Color": "0.2 0.6 0.9",
#   "Segment1_LabelValue": "2",
# }`;

const ITKSNAP_SNIPPET = `# ITK-SNAP exports single-label or multi-label NIfTI (.nii.gz).
# Label 0 is always background and excluded from marching cubes.
# Unique voxel values = one label per structure segmented.

import nibabel as nib
import numpy as np

img = nib.load("hippocampus_seg.nii.gz")
data = np.asarray(img.dataobj, dtype=np.int16)
unique_vals = np.unique(data)
labels = {int(v): f"Label {int(v)}" for v in unique_vals if v != 0}

# Correct mesh generation: pass voxel spacing from header for
# physically accurate real-world proportions:
voxel_spacing = img.header.get_zooms()[:3]  # (sx, sy, sz) in mm
verts, faces, _, _ = marching_cubes(
    (data == 1).astype(float),
    level=0.5,
    spacing=voxel_spacing       # <-- critical, omitting this distorts the mesh
)`;

const OSIRIX_SNIPPET = `# OsiriX / Horos export DICOM SEG (SOP Class 1.2.840.10008.5.1.4.1.1.66.4).
# SegmentSequence holds per-segment metadata including CIELab color.

import pydicom

ds = pydicom.dcmread("osirix_export.dcm")
for seg in ds.SegmentSequence:
    label_value = int(seg.SegmentNumber)
    name        = str(seg.SegmentLabel)           # e.g. "Tumor Region"
    lab_color   = seg.RecommendedDisplayCIELabValue  # [L, a, b] scaled 0-65535

    # CIELab → sRGB conversion (simplified)
    L  = lab_color[0] / 65535 * 100
    a  = lab_color[1] / 65535 * 255 - 128
    b  = lab_color[2] / 65535 * 255 - 128
    # ... full CIELab→XYZ→sRGB transform in segmentation_service.py

# Binary pixel data is 1-bit packed per frame (DICOM BIT1 encoding):
raw = np.frombuffer(ds.PixelData, dtype=np.uint8)
arr = np.unpackbits(raw, bitorder="little")\\
        .reshape(ds.NumberOfFrames, ds.Rows, ds.Columns)`;

interface CodeBlockProps { code: string }
function CodeBlock({ code }: CodeBlockProps) {
  return (
    <pre className="bg-slate-950 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed font-mono whitespace-pre">
      {code}
    </pre>
  );
}

const CONTENT: Record<Tool, React.ReactNode> = {
  "3D Slicer": (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">3D Slicer — Segment Editor Workflow</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          3D Slicer&apos;s <strong className="text-slate-200">Segment Editor</strong> module provides
          multi-label volumetric segmentation via tools including{" "}
          <em>Paint</em>, <em>Threshold</em>, <em>Grow from Seeds</em>, and{" "}
          <em>Fast Marching</em>. Output is saved as{" "}
          <code className="text-blue-300">.seg.nrrd</code> — a 3D NRRD array with Slicer-specific
          custom metadata encoding segment names, colors, and label values in the file header.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { step: "1", title: "Load Volume", desc: "Import DICOM or NIfTI into Slicer. Built-in DICOM reader handles series reconstruction." },
          { step: "2", title: "Segment Editor", desc: "Create segments. Use Threshold for bone/air contrast, Grow from Seeds for soft tissue, Paint for manual corrections." },
          { step: "3", title: "Export .seg.nrrd", desc: "Right-click the segmentation node → Export/Import Models and Tables → Export to .seg.nrrd." },
        ].map(({ step, title, desc }) => (
          <div key={step} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center mb-2">
              {step}
            </div>
            <p className="font-medium text-slate-200 mb-1">{title}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          .seg.nrrd Format — Backend Parsing
        </h4>
        <p className="text-xs text-slate-500 mb-2">
          SimpleITK reads pixel data; segment metadata lives in custom{" "}
          <code>key:=value</code> pairs before the double-newline header terminator.
        </p>
        <CodeBlock code={SLICER_NRRD_SNIPPET} />
      </div>

      <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
        <p className="text-xs text-blue-300">
          <strong>In this app:</strong> Upload a <code>.seg.nrrd</code> in the Segmentation
          page to see label names (e.g. &quot;Whole Tumor&quot;, &quot;Tumor Core&quot;) and
          colors as embedded by 3D Slicer — not generic integer IDs.
        </p>
      </div>
    </div>
  ),

  "ITK-SNAP": (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">ITK-SNAP — Semi-automatic Segmentation</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          ITK-SNAP uses the same <strong className="text-slate-200">ITK (Insight Toolkit)</strong>{" "}
          library underlying this app&apos;s SimpleITK backend. Its hallmark feature is{" "}
          <em>active contour / snake evolution</em> — the user places seeds, and a level-set
          function propagates through the image driven by edge and region-based forces.
          Output is standard NIfTI (<code className="text-violet-300">.nii.gz</code>) with integer
          label values (0 = background).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { step: "1", title: "Load Image", desc: "Open a .nii.gz or DICOM directory. ITK-SNAP auto-converts DICOM to NIfTI internally." },
          { step: "2", title: "Place Seeds", desc: "Mark foreground (structure) and background bubbles in the Snake ROI. Adjust speed image parameters." },
          { step: "3", title: "Evolve & Export", desc: "Run snake evolution. Export segmentation as .nii.gz with File → Save Segmentation Image." },
        ].map(({ step, title, desc }) => (
          <div key={step} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-violet-700 text-white text-xs flex items-center justify-center mb-2">
              {step}
            </div>
            <p className="font-medium text-slate-200 mb-1">{title}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          .nii.gz Parsing + Marching Cubes — Spacing is Critical
        </h4>
        <CodeBlock code={ITKSNAP_SNIPPET} />
      </div>

      <div className="bg-violet-950/30 border border-violet-800 rounded-lg p-4">
        <p className="text-xs text-violet-300">
          <strong>In this app:</strong> The mesh generator calls{" "}
          <code>skimage.measure.marching_cubes(..., spacing=sitk_image.GetSpacing())</code>.
          This is the same voxel spacing ITK-SNAP encodes in the NIfTI header — producing
          meshes with correct millimetre-scale proportions for downstream AI use.
        </p>
      </div>
    </div>
  ),

  "OsiriX / Horos": (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white mb-1">OsiriX / Horos — Clinical DICOM SEG Workflow</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          <strong className="text-slate-200">OsiriX</strong> (commercial) and{" "}
          <strong className="text-slate-200">Horos</strong> (free, macOS-only) are DICOM viewers
          built on the same codebase. ROI tools (freehand, threshold-based, semi-auto) produce
          segmentations exported as{" "}
          <strong className="text-teal-300">DICOM SEG</strong>{" "}
          (SOP class 1.2.840.10008.5.1.4.1.1.66.4) — a PACS-compatible format embedding 1-bit
          binary masks per segment, fully readable by any standard DICOM library.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { step: "1", title: "Open Series in PACS", desc: "OsiriX/Horos connects to any DICOM server or reads local DCM files. 4D MPR reconstruction is automatic." },
          { step: "2", title: "Draw ROIs", desc: "Use Freehand ROI, Smart Paint, or threshold-based ROI tools across slices. Propagate across frames with interpolation." },
          { step: "3", title: "Export DICOM SEG", desc: "File → Export → DICOM SEG. SegmentSequence is written with label names, CIELab colors, and coded property types." },
        ].map(({ step, title, desc }) => (
          <div key={step} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs flex items-center justify-center mb-2">
              {step}
            </div>
            <p className="font-medium text-slate-200 mb-1">{title}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-2">
          DICOM SEG Parsing — pydicom + CIELab color conversion
        </h4>
        <CodeBlock code={OSIRIX_SNIPPET} />
      </div>

      <div className="bg-teal-950/30 border border-teal-800 rounded-lg p-4 space-y-2">
        <p className="text-xs text-teal-300">
          <strong>PACS compatibility note:</strong> DICOM SEG is the standard clinical handoff
          format — any annotation created in OsiriX/Horos can be stored in a hospital PACS and
          retrieved by downstream AI pipelines without proprietary tooling.
        </p>
        <p className="text-xs text-teal-400">
          <strong>In this app:</strong> Upload a <code>.dcm</code> DICOM SEG to the Segmentation
          page. The backend reads <code>SegmentSequence</code>, converts CIELab to RGB for color
          swatches, and makes it available for 3D mesh generation — same pipeline as Slicer and
          ITK-SNAP outputs.
        </p>
      </div>
    </div>
  ),
};

export function ToolPanel() {
  const [active, setActive] = useState<Tool>("3D Slicer");

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-slate-700 pb-0">
        {TOOLS.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                        ${active === t
                          ? "border-blue-500 text-white bg-slate-800"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div>{CONTENT[active]}</div>
    </div>
  );
}
