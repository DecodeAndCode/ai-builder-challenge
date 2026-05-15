import { api } from "@/lib/api-client";
import { StateBadge } from "@/components/ui/Badge";
import type { Asset, Event } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function locationStr(loc: Asset["location"]): string {
  const parts = [
    loc.site,
    loc.room,
    loc.row,
    loc.rack,
    loc.ru ? `RU ${loc.ru}` : null,
  ].filter(Boolean);
  return parts.join(" / ") || "—";
}

const EVENT_LABELS: Record<string, string> = {
  receive: "Received",
  store: "Stored",
  deploy: "Deployed",
  rma_open: "RMA opened",
  rma_receive_back: "Returned from RMA",
  dispose: "Disposed",
  duplicate_receive: "Duplicate receive (idempotent)",
  transfer_custody: "Custody transferred",
};

function EventRow({ event }: { event: Event }) {
  const isDestructive = event.event_type === "dispose" || event.event_type === "rma_open";
  const isPositive = event.event_type === "deploy";

  return (
    <div className="flex gap-4 py-3">
      <div className="flex flex-col items-center gap-1 pt-1">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDestructive ? "bg-red-400" : isPositive ? "bg-green-500" : "bg-blue-400"}`} />
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">
            {EVENT_LABELS[event.event_type] ?? event.event_type}
          </span>
          <span className="text-xs text-gray-400 shrink-0">{formatDate(event.timestamp)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">by {event.user_id}</p>
        {event.from_state && event.to_state && (
          <p className="text-xs text-gray-400 mt-1">
            {event.from_state.replace(/_/g, " ")} → {event.to_state.replace(/_/g, " ")}
          </p>
        )}
        {event.to_location && (
          <p className="text-xs font-mono text-gray-400 mt-0.5">
            → {locationStr(event.to_location)}
          </p>
        )}
      </div>
    </div>
  );
}

export default async function ManagerAssetDetailPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<React.ReactElement> {
  const { tag } = await params;

  let asset: Asset;
  let events: Event[] = [];

  try {
    [asset, events] = await Promise.all([api.assets.get(tag), api.assets.history(tag)]);
  } catch {
    notFound();
  }

  const lastEvent = events[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/manager" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Assets
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm font-semibold text-gray-900">{asset.asset_tag}</span>
      </div>

      {/* Hero card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{asset.manufacturer} {asset.model}</h1>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{asset.asset_tag}</p>
          </div>
          <StateBadge state={asset.state} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm border-t border-gray-100 pt-4">
          <DetailField label="Serial" value={asset.serial} mono />
          <DetailField label="Class" value={asset.asset_class.replace(/_/g, " ")} />
          <DetailField label="Custodian" value={asset.custodian} />
          <DetailField label="Location" value={locationStr(asset.location)} mono />
          <DetailField label="Site" value={asset.location.site} />
          <DetailField label="Last updated" value={formatDate(asset.updated_at)} />
        </div>

        {lastEvent && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 border border-gray-100">
            Last activity: <span className="font-medium text-gray-700">{EVENT_LABELS[lastEvent.event_type] ?? lastEvent.event_type}</span> by {lastEvent.user_id} on {formatDate(lastEvent.timestamp)}
          </div>
        )}
      </div>

      {/* Event log */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Event log</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No events recorded.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl px-4 divide-y divide-gray-50">
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-gray-900 mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
    </div>
  );
}
