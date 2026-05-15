import type { Asset, FacilitiesRecord, FinanceRecord } from "./types";

export type ReconcileCategory =
  | "location_drift"
  | "missing_facilities"
  | "orphan_facilities"
  | "finance_status_mismatch"
  | "orphan_finance"
  | "expected_gap";

export interface ReconcileItem {
  asset_tag: string;
  category: ReconcileCategory;
  summary: string;
  detail: string;
  ops?: Partial<Asset>;
  facilities?: FacilitiesRecord | null;
  finance?: FinanceRecord | null;
}

export interface ReconcileReport {
  generated_at: string;
  total_assets: number;
  total_facilities: number;
  total_finance: number;
  items: ReconcileItem[];
  counts: Record<ReconcileCategory, number>;
}

// Build a normalized path from ops fields matching the facilities format
// Facilities uses "site/room/row/rack/ru" with "/" separators
function opsFullPath(asset: Asset): string {
  return [
    asset.location.site,
    asset.location.room,
    asset.location.row,
    asset.location.rack,
    asset.location.ru,
  ]
    .filter(Boolean)
    .join("/");
}

// Facilities rack_location may be a full slash-path or a short rack-RU string
// Normalize both sides to a comparable form
function locationsMatch(asset: Asset, fac: FacilitiesRecord): boolean {
  const facLoc = fac.rack_location ?? "";
  const opsPath = opsFullPath(asset);
  if (!facLoc || !opsPath) return true; // unknown — don't flag
  // Exact match
  if (facLoc === opsPath) return true;
  // Facilities may be a suffix: "rack/ru"
  const opsSuffix = [asset.location.rack, asset.location.ru].filter(Boolean).join("/");
  if (facLoc === opsSuffix) return true;
  return false;
}

export function buildReconcileReport(
  assets: Asset[],
  facilities: FacilitiesRecord[],
  finance: FinanceRecord[],
): ReconcileReport {
  const facilityByTag = new Map(facilities.map((f) => [f.tagged_id, f]));
  const financeByTag = new Map(finance.map((f) => [f.tag, f]));
  const seenInOps = new Set<string>();

  const items: ReconcileItem[] = [];

  for (const asset of assets) {
    const tag = asset.asset_tag;
    seenInOps.add(tag);

    const fac = facilityByTag.get(tag) ?? null;
    const fin = financeByTag.get(tag) ?? null;

    const isActive = asset.state === "in_service";
    const isStored = asset.state === "stored" || asset.state === "received";
    const isRetired = asset.state === "disposed" || asset.state === "rma_pending";

    // in_service but missing facilities record — facilities should track this
    if (isActive && !fac) {
      items.push({
        asset_tag: tag,
        category: "missing_facilities",
        summary: "In service but not in facilities",
        detail: `Operations shows this asset deployed at ${opsFullPath(asset) || asset.location.site}, but it has no facilities record. Either the deploy scan didn't write back, or it was racked before sync was set up.`,
        ops: { state: asset.state, location: asset.location },
        facilities: null,
        finance: fin,
      });
      continue;
    }

    // in_service with facilities but locations disagree
    if (isActive && fac) {
      if (!locationsMatch(asset, fac)) {
        const opsPath = opsFullPath(asset);
        const facLoc = fac.rack_location ?? "(none)";
        items.push({
          asset_tag: tag,
          category: "location_drift",
          summary: "Location mismatch between operations and facilities",
          detail: `Operations: ${opsPath} — Facilities: ${facLoc}. One was updated without the other.`,
          ops: { state: asset.state, location: asset.location },
          facilities: fac,
          finance: fin,
        });
      }
    }

    // Stored/received asset in facilities — facilities shouldn't track non-racked items
    if (isStored && fac && fac.rack_location) {
      items.push({
        asset_tag: tag,
        category: "location_drift",
        summary: "Stored asset still has a facilities rack record",
        detail: `This asset is ${asset.state} but still appears in facilities at ${fac.rack_location}. It was likely de-racked without a sync write.`,
        ops: { state: asset.state, location: asset.location },
        facilities: fac,
        finance: fin,
      });
      continue;
    }

    // Stored or received — not in facilities is expected (stored items aren't racked)
    if (isStored) {
      // A capitalized-in-finance stored asset is acceptable: it was previously deployed
      // and its book value is still tracked. Only flag if finance shows pending_receipt
      // for a long-stored item — but that needs time data we don't have. Skip for now.
      continue;
    }

    // Disposed but still capitalized in finance
    if (isRetired && fin && fin.status === "capitalized") {
      items.push({
        asset_tag: tag,
        category: "finance_status_mismatch",
        summary: "Disposed or pending RMA but still capitalized",
        detail: `Operations state is ${asset.state}, but finance still shows this asset as capitalized. Finance team should mark it retired or impaired.`,
        ops: { state: asset.state, location: asset.location },
        facilities: fac,
        finance: fin,
      });
    }
  }

  // Facilities records for assets not in ops
  for (const fac of facilities) {
    if (!seenInOps.has(fac.tagged_id)) {
      items.push({
        asset_tag: fac.tagged_id,
        category: "orphan_facilities",
        summary: "In facilities but not in operations",
        detail: `Facilities shows ${fac.tagged_id} at ${fac.rack_location ?? "unknown"}, but operations has no record of this asset. It may have been added to facilities directly or the ops record was deleted.`,
        facilities: fac,
        finance: financeByTag.get(fac.tagged_id) ?? null,
      });
    }
  }

  // Finance records for assets not in ops
  for (const fin of finance) {
    if (!seenInOps.has(fin.tag)) {
      items.push({
        asset_tag: fin.tag,
        category: "orphan_finance",
        summary: "In finance but not in operations",
        detail: `Finance tracks ${fin.tag} at ${fin.site ?? "unknown site"} with status ${fin.status}, but operations has no matching asset. Check if the tag was renamed or if this is a pending-receipt item not yet scanned in.`,
        finance: fin,
        facilities: facilityByTag.get(fin.tag) ?? null,
      });
    }
  }

  // Sort: actionable first
  const PRIORITY: Record<ReconcileCategory, number> = {
    location_drift: 0,
    missing_facilities: 1,
    finance_status_mismatch: 2,
    orphan_facilities: 3,
    orphan_finance: 4,
    expected_gap: 5,
  };
  items.sort((a, b) => PRIORITY[a.category] - PRIORITY[b.category]);

  const counts = items.reduce(
    (acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<ReconcileCategory, number>,
  );

  return {
    generated_at: new Date().toISOString(),
    total_assets: assets.length,
    total_facilities: facilities.length,
    total_finance: finance.length,
    items,
    counts,
  };
}
