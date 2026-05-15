"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { AssetCard } from "@/components/AssetCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StateBadge } from "@/components/ui/Badge";
import { getCurrentUserId } from "@/lib/auth";
import type { Asset, Location } from "@/lib/types";
import { ApiError, api } from "@/lib/api-client";

type Step = "tag" | "preview" | "location" | "loading" | "success" | "error";

export default function TechStorePage() {
  const [step, setStep] = useState<Step>("tag");
  const [tag, setTag] = useState("");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showLocationCamera, setShowLocationCamera] = useState(false);
  const [site, setSite] = useState("");
  const [room, setRoom] = useState("");
  const [row, setRow] = useState("");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function handleTagScan(value: string) {
    setTag(value);
    setLookupError(null);
    setLookupLoading(true);
    try {
      const a = await api.assets.get(value);
      setPreviewAsset(a);
      setStep("preview");
    } catch (e) {
      if (e instanceof ApiError && e.code === "unknown_asset") {
        setLookupError(`Tag "${value}" not found. Use Receive for new assets.`);
      } else {
        setLookupError("Couldn't look up asset. Check your connection.");
      }
    } finally {
      setLookupLoading(false);
    }
  }

  function handleLocationScan(value: string) {
    // Location barcodes: "SITE:SEA-1/RACK:R-01/RU:12" or plain site
    const parts = value.split("/");
    for (const p of parts) {
      const [k, v] = p.split(":");
      if (k === "SITE" && v) setSite(v);
      if (k === "ROOM" && v) setRoom(v);
      if (k === "ROW" && v) setRow(v);
    }
    if (!parts.some((p) => p.includes(":"))) {
      setSite(value);
    }
    setShowLocationCamera(false);
  }

  async function handleConfirm() {
    if (!previewAsset) return;
    setStep("loading");
    setError(null);
    try {
      const location: Location = {
        site: site.trim() || previewAsset.location.site,
        room: room.trim() || null,
        row: row.trim() || null,
        rack: null,
        ru: null,
      };
      const res = await fetch("/api/scans/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: tag,
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
    setPreviewAsset(null);
    setSite("");
    setRoom("");
    setRow("");
    setAsset(null);
    setError(null);
    setLookupError(null);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/tech" className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-xl font-semibold">Store asset</h1>
      </div>

      {step === "tag" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Scan the asset tag to see its current state before storing.</p>
          {lookupLoading ? (
            <div className="flex items-center gap-3 py-6">
              <Spinner />
              <span className="text-sm text-gray-500">Looking up asset…</span>
            </div>
          ) : (
            <ScanInput onScan={handleTagScan} placeholder="Asset tag" label="Asset tag" />
          )}
          {lookupError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              {lookupError}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            <CameraIcon /> Use camera to scan
          </button>
          {showCamera && (
            <BarcodeScanner
              onScan={(v) => { setShowCamera(false); handleTagScan(v); }}
              onClose={() => setShowCamera(false)}
            />
          )}
        </div>
      )}

      {step === "preview" && previewAsset && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Scanned asset</p>
              <StateBadge state={previewAsset.state} />
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div><span className="text-gray-400 w-24 inline-block">Tag</span><span className="font-mono">{previewAsset.asset_tag}</span></div>
              <div><span className="text-gray-400 w-24 inline-block">Model</span>{previewAsset.manufacturer} {previewAsset.model}</div>
              <div><span className="text-gray-400 w-24 inline-block">Location</span><span className="font-mono">{previewAsset.location.site}{previewAsset.location.room ? ` / ${previewAsset.location.room}` : ""}</span></div>
              <div><span className="text-gray-400 w-24 inline-block">Custodian</span>{previewAsset.custodian}</div>
            </div>
          </div>

          {previewAsset.state === "in_service" && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              This asset is currently in service. Storing it will remove it from the rack and update facilities.
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Storage location</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Site</span>
                <input
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="field-input"
                  placeholder={previewAsset.location.site}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Room</span>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="field-input"
                  placeholder="Storage bay"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationCamera(true)}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <CameraIcon className="w-4 h-4" /> Scan location barcode
            </button>
            {showLocationCamera && (
              <BarcodeScanner
                onScan={handleLocationScan}
                onClose={() => setShowLocationCamera(false)}
              />
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("tag")}>
              Re-scan tag
            </Button>
            <Button className="flex-1" size="lg" onClick={handleConfirm}>
              Confirm store
            </Button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Storing asset…</p>
        </div>
      )}

      {step === "success" && asset && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600 text-xl" aria-hidden="true">✓</span>
            <div>
              <p className="font-medium text-green-900">Asset stored</p>
              <p className="text-sm text-green-700">Location updated. Ready for next scan.</p>
            </div>
          </div>
          <AssetCard asset={asset} />
          <Button variant="secondary" size="lg" className="w-full" onClick={reset}>
            Store another
          </Button>
        </div>
      )}

      {step === "error" && (
        <div className="space-y-4">
          <ErrorBanner error={error} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={reset}>Start over</Button>
            <Button className="flex-1" onClick={() => { setStep("preview"); setError(null); }}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CameraIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
