import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Asset tracking</h1>
        <p className="text-gray-500 text-sm mt-1">
          Three systems, one source of truth. Pick a role.
        </p>
      </div>

      <div className="grid gap-4">
        <Link
          href="/tech"
          className="group flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 text-lg" aria-hidden="true">
            📱
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Technician</p>
            <p className="text-sm text-gray-500">Scan workflows — receive, store, deploy, transfer.</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/manager"
          className="group flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0 text-green-600 text-lg" aria-hidden="true">
            📊
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Asset manager</p>
            <p className="text-sm text-gray-500">Browse assets, review event history, run reconciliation.</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Use the role switcher in the header to change your user context.
      </p>
    </div>
  );
}
