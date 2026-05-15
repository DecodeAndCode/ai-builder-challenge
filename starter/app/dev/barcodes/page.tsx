"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const DEMO_TAGS = [
  { value: "C0000107", label: "C0000107 — received asset" },
  { value: "C0001082", label: "C0001082 — received asset" },
  { value: "C0000101", label: "C0000101 — in service (location drift)" },
  { value: "C9990001", label: "C9990001 — demo new receive" },
  { value: "C9990002", label: "C9990002 — demo new receive" },
];

const DEMO_LOCATIONS = [
  { value: "SITE:SEA-1/ROOM:Lab-1/RACK:Rack-A/RU:4", label: "SEA-1 / Lab-1 / Rack-A / RU 4" },
  { value: "SITE:SEA-1/ROOM:Lab-2/RACK:Rack-B/RU:12", label: "SEA-1 / Lab-2 / Rack-B / RU 12" },
  { value: "SITE:NYC-1/ROOM:Dock/RACK:Rack-C/RU:8", label: "NYC-1 / Dock / Rack-C / RU 8" },
];

const DEMO_BADGES = [
  { value: "tech-mike", label: "Badge: tech-mike" },
  { value: "tech-jane", label: "Badge: tech-jane" },
  { value: "manager-paul", label: "Badge: manager-paul" },
];

function Barcode({ value, label }: { value: string; label: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12,
      margin: 8,
    });
  }, [value]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center space-y-2 print:break-inside-avoid">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <svg ref={svgRef} className="mx-auto" />
    </div>
  );
}

export default function BarcodesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Demo barcodes</h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          Print
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Asset tags</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {DEMO_TAGS.map((t) => (
            <Barcode key={t.value} value={t.value} label={t.label} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Rack locations</h2>
        <p className="text-xs text-gray-400">Format: SITE:x/ROOM:x/RACK:x/RU:x</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_LOCATIONS.map((l) => (
            <Barcode key={l.value} value={l.value} label={l.label} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">User badges</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {DEMO_BADGES.map((b) => (
            <Barcode key={b.value} value={b.value} label={b.label} />
          ))}
        </div>
      </section>

      <p className="text-xs text-gray-400 border-t pt-4">
        Dev-only page. Not linked from production UI.
      </p>
    </div>
  );
}
