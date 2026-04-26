import Link from "next/link";

const FEATURES = [
  {
    href: "/dicom",
    title: "DICOM Browser",
    desc: "Browse DICOM series, inspect metadata tags, render MPR slices via Cornerstone.js v3.",
    tool: "3D Slicer · OsiriX",
    color: "from-blue-800 to-blue-900",
    icon: "🗂",
  },
  {
    href: "/segmentation",
    title: "Segmentation Manager",
    desc: "Upload .seg.nrrd, .nii.gz, or DICOM SEG files. Auto-detects format and extracts label maps.",
    tool: "3D Slicer · ITK-SNAP · OsiriX",
    color: "from-violet-800 to-violet-900",
    icon: "🧩",
  },
  {
    href: "/mesh",
    title: "3D Asset Generation",
    desc: "Marching cubes pipeline with Gaussian pre-smoothing → GLB/STL/OBJ export. Physically correct voxel spacing.",
    tool: "ITK-SNAP · 3D Slicer",
    color: "from-teal-800 to-teal-900",
    icon: "🔷",
  },
  {
    href: "/qa",
    title: "Annotation QA",
    desc: "Review segmentations across tool formats. Approve · Reject · Flag with full audit trail.",
    tool: "Multi-tool workflow",
    color: "from-emerald-800 to-emerald-900",
    icon: "✅",
  },
  {
    href: "/tools",
    title: "Tool Showcase",
    desc: "Deep-dives into 3D Slicer, ITK-SNAP, and OsiriX/Horos — workflow docs, format specs, live code.",
    tool: "3D Slicer · ITK-SNAP · Horos",
    color: "from-orange-800 to-orange-900",
    icon: "🔬",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Medical Imaging AI Research Portfolio
        </h1>
        <p className="text-slate-400 max-w-2xl">
          End-to-end pipeline demonstrating segmentation ingestion, 3D digital
          asset generation, and multi-tool annotation QA using{" "}
          <span className="text-blue-400">3D Slicer</span>,{" "}
          <span className="text-violet-400">ITK-SNAP</span>, and{" "}
          <span className="text-teal-400">OsiriX / Horos</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`block rounded-xl bg-gradient-to-br ${f.color} border border-white/10
                        p-6 hover:border-white/30 transition-all hover:scale-[1.01]`}
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h2 className="text-lg font-semibold text-white mb-1">{f.title}</h2>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">{f.desc}</p>
            <span className="text-[11px] bg-black/30 text-slate-300 rounded-full px-3 py-1">
              {f.tool}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 card">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Start</h3>
        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
          <li>
            Run{" "}
            <code className="text-blue-300 bg-slate-900 px-1 rounded">
              bash scripts/download_sample_data.sh
            </code>{" "}
            to fetch public sample DICOMs and segmentations.
          </li>
          <li>
            Navigate to{" "}
            <Link href="/dicom" className="text-blue-400 hover:underline">
              DICOM Browser
            </Link>{" "}
            to browse and view the loaded series.
          </li>
          <li>
            Go to{" "}
            <Link href="/segmentation" className="text-violet-400 hover:underline">
              Segmentation
            </Link>{" "}
            and upload a <code className="text-slate-300">.seg.nrrd</code>,{" "}
            <code className="text-slate-300">.nii.gz</code>, or DICOM SEG file.
          </li>
          <li>
            Use{" "}
            <Link href="/mesh" className="text-teal-400 hover:underline">
              3D Assets
            </Link>{" "}
            to generate a mesh and inspect it in the Three.js viewer.
          </li>
          <li>
            Review segmentation quality in{" "}
            <Link href="/qa" className="text-emerald-400 hover:underline">
              Annotation QA
            </Link>
            .
          </li>
        </ol>
      </div>
    </div>
  );
}
