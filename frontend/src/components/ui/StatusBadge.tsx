import type { QAStatus } from "@/types";

const STYLES: Record<QAStatus, string> = {
  pending: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  approved: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  rejected: "bg-red-900/50 text-red-300 border-red-700",
  flagged: "bg-orange-900/50 text-orange-300 border-orange-700",
};

export function StatusBadge({ status }: { status: QAStatus }) {
  return (
    <span className={`badge border ${STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
