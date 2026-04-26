import { QADashboard } from "@/components/QADashboard";

export default function QAPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Annotation QA</h1>
      <p className="text-slate-400 text-sm mb-6">
        Review segmentation annotations from 3D Slicer, ITK-SNAP, and OsiriX/Horos.
        All status changes are persisted with a full audit trail.
      </p>
      <QADashboard />
    </div>
  );
}
