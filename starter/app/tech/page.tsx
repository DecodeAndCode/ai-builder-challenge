import Link from "next/link";

const workflows = [
  {
    href: "/tech/receive",
    label: "Receive",
    description: "Log a new or returning asset into the system.",
    icon: "📥",
  },
  {
    href: "/tech/store",
    label: "Store",
    description: "Move an asset to a storage location.",
    icon: "📦",
  },
  {
    href: "/tech/deploy",
    label: "Deploy",
    description: "Rack an asset and put it in service.",
    icon: "🔌",
  },
  {
    href: "/tech/transfer",
    label: "Transfer custody",
    description: "Hand off an asset to another person.",
    icon: "🔁",
  },
];

export default function TechLandingPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan workflows</h1>
        <p className="text-gray-500 text-sm mt-1">Choose a workflow to begin.</p>
      </div>
      <div className="space-y-3">
        {workflows.map((w) => (
          <Link
            key={w.href}
            href={w.href}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.99]"
          >
            <span className="text-2xl" aria-hidden="true">{w.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{w.label}</p>
              <p className="text-sm text-gray-500 truncate">{w.description}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
