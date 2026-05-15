import type { Asset } from "@/lib/types";
import { StateBadge } from "./ui/Badge";

function locationLine(loc: Asset["location"]): string {
  const parts = [loc.site, loc.room, loc.rack, loc.ru ? `RU${loc.ru}` : null].filter(Boolean);
  return parts.join(" / ") || "No location";
}

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold text-gray-900">{asset.asset_tag}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {asset.manufacturer} {asset.model}
          </p>
        </div>
        <StateBadge state={asset.state} />
      </div>
      <div className="text-xs text-gray-500 space-y-1 pt-1 border-t border-gray-100">
        <div className="flex gap-2">
          <span className="w-20 text-gray-400 shrink-0">Location</span>
          <span className="font-mono">{locationLine(asset.location)}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-gray-400 shrink-0">Custodian</span>
          <span>{asset.custodian}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-20 text-gray-400 shrink-0">Serial</span>
          <span className="font-mono">{asset.serial}</span>
        </div>
      </div>
    </div>
  );
}
