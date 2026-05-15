"use client";

import { useState, useRef, useEffect } from "react";
import { ScanInput } from "@/components/ScanInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { AssetCard } from "@/components/AssetCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getCurrentUserId } from "@/lib/auth";
import type { Asset, AssetClass, Location } from "@/lib/types";
import { ApiError } from "@/lib/api-client";

const ASSET_CLASSES: AssetClass[] = [
  "instrument",
  "compute",
  "network",
  "power",
  "consumable_durable",
];

const CLASS_LABELS: Record<AssetClass, string> = {
  instrument: "Instrument",
  compute: "Compute",
  network: "Network",
  power: "Power",
  consumable_durable: "Consumable / Durable",
};

type Step = "tag" | "details" | "loading" | "success" | "error";

export default function TechReceivePage() {
  const [step, setStep] = useState<Step>("tag");
  const [tag, setTag] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [serial, setSerial] = useState("");
  const [model, setModel] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("instrument");
  const [site, setSite] = useState("");
  const [room, setRoom] = useState("");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const serialRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "details") serialRef.current?.focus();
  }, [step]);

  function handleTagScan(value: string) {
    setTag(value);
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("loading");
    setError(null);
    try {
      const location: Location = {
        site: site.trim(),
        room: room.trim() || null,
        row: null,
        rack: null,
        ru: null,
      };
      const res = await fetch("/api/scans/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: tag,
          serial: serial.trim(),
          model: model.trim(),
          manufacturer: manufacturer.trim(),
          asset_class: assetClass,
          location,
          user_id: getCurrentUserId(),
          scan_payload: tag,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new ApiError(
          res.status,
          json.error?.code ?? "unknown_error",
          json.error?.message ?? `HTTP ${res.status}`,
          json.error?.details,
        );
      }
      setAsset(json as Asset);
      setStep("success");
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setStep("error");
    }
  }

  function reset() {
    setStep("tag");
    setTag("");
    setSerial("");
    setModel("");
    setManufacturer("");
    setAssetClass("instrument");
    setSite("");
    setRoom("");
    setAsset(null);
    setError(null);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/tech" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Back
        </a>
        <h1 className="text-xl font-semibold">Receive asset</h1>
      </div>

      {step === "tag" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Scan the asset tag or type it and press Enter.
          </p>
          <ScanInput
            onScan={handleTagScan}
            placeholder="Asset tag (e.g. A-00042)"
            label="Asset tag"
          />
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Use camera to scan
          </button>
          {showCamera && (
            <BarcodeScanner
              onScan={(v) => { setShowCamera(false); handleTagScan(v); }}
              onClose={() => setShowCamera(false)}
            />
          )}
        </div>
      )}

      {step === "details" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm">
            Tag: <span className="font-mono font-semibold">{tag}</span>
            <button type="button" onClick={() => setStep("tag")} className="ml-3 text-blue-600 hover:underline text-xs">
              change
            </button>
          </div>

          <Field label="Serial number *" required>
            <input
              ref={serialRef}
              required
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="field-input"
              placeholder="SN-12345"
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Manufacturer *" required>
              <input
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="field-input"
                placeholder="Acme Corp"
              />
            </Field>
            <Field label="Model *" required>
              <input
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="field-input"
                placeholder="X-9000"
              />
            </Field>
          </div>

          <Field label="Asset class *" required>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as AssetClass)}
              className="field-input"
            >
              {ASSET_CLASSES.map((c) => (
                <option key={c} value={c}>{CLASS_LABELS[c]}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Site *" required>
              <input
                required
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="field-input"
                placeholder="SEA-1"
              />
            </Field>
            <Field label="Room">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="field-input"
                placeholder="Dock bay"
              />
            </Field>
          </div>

          <Button type="submit" size="lg" className="w-full">
            Receive asset
          </Button>
        </form>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Recording receive…</p>
        </div>
      )}

      {step === "success" && asset && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600 text-xl" aria-hidden="true">✓</span>
            <div>
              <p className="font-medium text-green-900">Asset received</p>
              <p className="text-sm text-green-700">Logged and ready to store or deploy.</p>
            </div>
          </div>
          <AssetCard asset={asset} />
          <Button variant="secondary" size="lg" className="w-full" onClick={reset}>
            Receive another
          </Button>
        </div>
      )}

      {step === "error" && (
        <div className="space-y-4">
          <ErrorBanner error={error} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={reset}>
              Start over
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setStep("details");
                setError(null);
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">
        {label.replace(" *", "")}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
