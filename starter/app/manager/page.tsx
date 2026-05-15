import { Suspense } from "react";
import { api } from "@/lib/api-client";
import type { Asset, AssetState } from "@/lib/types";
import { StateBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

const PAGE_SIZE = 25;

const STATES: AssetState[] = ["received", "stored", "in_service", "rma_pending", "disposed", "unreceived"];

interface SearchParams {
  state?: string;
  site?: string;
  custodian?: string;
  page?: string;
}

async function AssetTable({ searchParams }: { searchParams: SearchParams }) {
  const filters = {
    state: searchParams.state || undefined,
    site: searchParams.site || undefined,
    custodian: searchParams.custodian || undefined,
  };

  let assets: Asset[] = [];
  let fetchError: string | null = null;

  try {
    assets = await api.assets.list(filters);
  } catch {
    fetchError = "Failed to load assets. Check that the API is running.";
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const total = assets.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const pageAssets = assets.slice(start, start + PAGE_SIZE);

  if (fetchError) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
        {fetchError}
      </div>
    );
  }

  if (pageAssets.length === 0) {
    return (
      <EmptyState
        title={filters.state || filters.site || filters.custodian ? "No assets match these filters." : "No assets found."}
        description={filters.state || filters.site || filters.custodian ? "Try clearing some filters." : undefined}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Showing {start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total} assets
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Tag</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Model</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">State</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide hidden sm:table-cell">Location</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide hidden lg:table-cell">Custodian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageAssets.map((asset) => (
              <tr key={asset.asset_tag} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/manager/assets/${asset.asset_tag}`}
                    className="font-mono text-blue-600 hover:underline font-medium"
                  >
                    {asset.asset_tag}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                  <div className="leading-snug">
                    <div>{asset.model}</div>
                    <div className="text-xs text-gray-400">{asset.manufacturer}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StateBadge state={asset.state} />
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs hidden sm:table-cell">
                  {[asset.location.site, asset.location.rack, asset.location.ru ? `RU${asset.location.ru}` : null]
                    .filter(Boolean)
                    .join(" / ") || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{asset.custodian}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} searchParams={searchParams} />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: SearchParams;
}) {
  function href(p: number) {
    const q = new URLSearchParams();
    if (searchParams.state) q.set("state", searchParams.state);
    if (searchParams.site) q.set("site", searchParams.site);
    if (searchParams.custodian) q.set("custodian", searchParams.custodian);
    q.set("page", String(p));
    return `/manager?${q.toString()}`;
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <Link
        href={href(page - 1)}
        className={`text-sm px-3 py-1.5 rounded border ${page <= 1 ? "pointer-events-none text-gray-300 border-gray-200" : "text-gray-600 border-gray-300 hover:bg-gray-50"}`}
        aria-disabled={page <= 1}
      >
        ← Prev
      </Link>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <Link
        href={href(page + 1)}
        className={`text-sm px-3 py-1.5 rounded border ${page >= totalPages ? "pointer-events-none text-gray-300 border-gray-200" : "text-gray-600 border-gray-300 hover:bg-gray-50"}`}
        aria-disabled={page >= totalPages}
      >
        Next →
      </Link>
    </div>
  );
}

export default async function ManagerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">All tracked assets across all sites.</p>
        </div>
        <Link
          href="/manager/reconcile"
          className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Reconcile →
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 block" htmlFor="state-filter">State</label>
          <select
            id="state-filter"
            name="state"
            defaultValue={sp.state ?? ""}
            className="field-input py-1.5 text-sm min-w-[130px]"
          >
            <option value="">All states</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 block" htmlFor="site-filter">Site</label>
          <input
            id="site-filter"
            name="site"
            defaultValue={sp.site ?? ""}
            className="field-input py-1.5 text-sm w-28"
            placeholder="e.g. SEA-1"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 block" htmlFor="custodian-filter">Custodian</label>
          <input
            id="custodian-filter"
            name="custodian"
            defaultValue={sp.custodian ?? ""}
            className="field-input py-1.5 text-sm w-32"
            placeholder="user-id"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 min-h-[36px]"
        >
          Filter
        </button>
        {(sp.state || sp.site || sp.custodian) && (
          <Link href="/manager" className="text-sm text-gray-400 hover:text-gray-600 self-center">
            Clear
          </Link>
        )}
      </form>

      <Suspense fallback={<div className="text-sm text-gray-400 py-8 text-center">Loading assets…</div>}>
        <AssetTable searchParams={sp} />
      </Suspense>
    </div>
  );
}
