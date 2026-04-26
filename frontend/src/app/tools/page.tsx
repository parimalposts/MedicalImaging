import { ToolPanel } from "@/components/ToolPanel";

export default function ToolsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-1">Tool Showcase</h1>
      <p className="text-slate-400 text-sm mb-8">
        Deep-dive into the three medical imaging tools integrated into this pipeline.
        Each tab shows the workflow, file format internals, and the exact backend code
        that handles each tool&apos;s output.
      </p>
      <ToolPanel />
    </div>
  );
}
