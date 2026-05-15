import Link from "next/link";
import { api } from "@/lib/api-client";
import { buildReconcileReport } from "@/lib/reconcile";
import type { ReconcileCategory, ReconcileItem } from "@/lib/reconcile";

const CATEGORY_META: Record<
  ReconcileCategory,
  { label: string; description: string; color: string; bg: string; border: string }
> = {
  location_drift: {
    label: "Location drift",
    description: "Operations and facilities disagree on where this asset is racked.",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  missing_facilities: {
    label: "Missing facilities record",
    description: "Asset is in service but has no entry in the facilities system.",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  finance_status_mismatch: {
    label: "Finance status mismatch",
    description: "Operations state and finance capitalization status disagree.",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  orphan_facilities: {
    label: "Ghost in facilities",
    description: "Facilities has a record for this tag, but operations doesn't know it exists.",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  orphan_finance: {
    label: "Ghost in finance",
    description: "Finance tracks this tag, but operations has no matching asset.",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  expected_gap: {
    label: "Expected gap",
    description: "Difference is explained by asset state — no action needed.",
    color: "text-gray-600",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
};

function CategorySection({ category, items }: { category: ReconcileCategory; items: ReconcileItem[] }) {
  const meta = CATEGORY_META[category];
  if (!items.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className={`text-sm font-semibold ${meta.color}`}>{meta.label}</h2>
        <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}>
          {items.length}
        </span>
      </div>
      <p className="text-xs text-gray-500">{meta.description}</p>
      <div className={`rounded-lg border ${meta.border} divide-y ${meta.border} overflow-hidden`}>
        {items.map((item) => (
          <div key={item.asset_tag} className={`${meta.bg} px-4 py-3`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/manager/assets/${item.asset_tag}`}
                  className={`font-mono text-sm font-semibold hover:underline ${meta.color}`}
                >
                  {item.asset_tag}
                </Link>
                <p className="text-xs text-gray-600 mt-1">{item.detail}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {item.ops?.state && (
                <span className="text-gray-500">
                  Ops: <span className="font-medium">{item.ops.state.replace(/_/g, " ")}</span>
                </span>
              )}
              {item.facilities?.rack_location && (
                <span className="text-gray-500">
                  Facilities: <span className="font-mono font-medium">{item.facilities.rack_location}</span>
                </span>
              )}
              {item.finance?.status && (
                <span className="text-gray-500">
                  Finance: <span className="font-medium">{item.finance.status.replace(/_/g, " ")}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ManagerReconcilePage() {
  let report;
  let fetchError: string | null = null;

  try {
    const [assets, facilities, finance] = await Promise.all([
      api.assets.list(),
      api.mock.facilities(),
      api.mock.finance(),
    ]);
    report = buildReconcileReport(assets, facilities, finance);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Unknown error";
  }

  if (fetchError || !report) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/manager" className="text-gray-400 hover:text-gray-600 text-sm">← Assets</Link>
          <h1 className="text-xl font-semibold">Reconciliation</h1>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-800">
          Couldn't load reconciliation data. Check that the API is running and try again.
          {fetchError && <p className="mt-1 font-mono text-xs opacity-75">{fetchError}</p>}
        </div>
      </div>
    );
  }

  const categorized = (Object.keys(CATEGORY_META) as ReconcileCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = report.items.filter((i: ReconcileItem) => i.category === cat);
      return acc;
    },
    {} as Record<ReconcileCategory, ReconcileItem[]>,
  );

  const actionableCount =
    (report.counts.location_drift ?? 0) +
    (report.counts.missing_facilities ?? 0) +
    (report.counts.finance_status_mismatch ?? 0);

  const orphanCount =
    (report.counts.orphan_facilities ?? 0) + (report.counts.orphan_finance ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/manager" className="text-gray-400 hover:text-gray-600 text-sm">← Assets</Link>
          <h1 className="text-xl font-semibold">Reconciliation</h1>
        </div>
        <p className="text-xs text-gray-400">
          {new Date(report.generated_at).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Ops assets" value={report.total_assets} />
        <SummaryCard label="Facilities records" value={report.total_facilities} />
        <SummaryCard label="Finance records" value={report.total_finance} />
      </div>

      {report.items.length === 0 ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-8 text-center space-y-1">
          <p className="text-green-800 font-semibold text-lg">All systems in sync</p>
          <p className="text-sm text-green-600">No discrepancies found across operations, facilities, and finance.</p>
        </div>
      ) : (
        <>
          {actionableCount > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <span className="font-medium">{actionableCount} item{actionableCount !== 1 ? "s" : ""}</span> need attention.
              {orphanCount > 0 && ` Also ${orphanCount} orphaned record${orphanCount !== 1 ? "s" : ""} to investigate.`}
            </div>
          )}
          {actionableCount === 0 && orphanCount > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              No location drift. {orphanCount} orphaned record{orphanCount !== 1 ? "s" : ""} worth investigating.
            </div>
          )}

          <div className="space-y-6">
            {(Object.keys(CATEGORY_META) as ReconcileCategory[]).map((cat) => (
              <CategorySection key={cat} category={cat} items={categorized[cat] ?? []} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
      <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
