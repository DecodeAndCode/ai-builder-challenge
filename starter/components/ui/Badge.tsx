import type { AssetState } from "@/lib/types";

const STATE_STYLES: Record<AssetState, string> = {
  unreceived: "bg-gray-100 text-gray-600",
  received: "bg-blue-100 text-blue-700",
  stored: "bg-yellow-100 text-yellow-700",
  in_service: "bg-green-100 text-green-700",
  rma_pending: "bg-orange-100 text-orange-700",
  disposed: "bg-red-100 text-red-600",
};

const STATE_LABELS: Record<AssetState, string> = {
  unreceived: "Unreceived",
  received: "Received",
  stored: "Stored",
  in_service: "In service",
  rma_pending: "RMA pending",
  disposed: "Disposed",
};

export function StateBadge({ state }: { state: AssetState }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_STYLES[state] ?? "bg-gray-100 text-gray-600"}`}
    >
      {STATE_LABELS[state] ?? state}
    </span>
  );
}
