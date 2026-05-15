"use client";

import { useState } from "react";
import { ScanInput } from "@/components/ScanInput";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { AssetCard } from "@/components/AssetCard";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getCurrentUserId } from "@/lib/auth";
import type { Asset } from "@/lib/types";
import { ApiError, api } from "@/lib/api-client";

type Step = "asset" | "custodian" | "confirm" | "loading" | "success" | "error";

export default function TechTransferPage() {
  const [step, setStep] = useState<Step>("asset");
  const [tag, setTag] = useState("");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [toCustodian, setToCustodian] = useState("");
  const [showAssetCamera, setShowAssetCamera] = useState(false);
  const [showBadgeCamera, setShowBadgeCamera] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const fromUser = getCurrentUserId();

  async function handleTagScan(value: string) {
    setTag(value);
    setLookupError(null);
    setLookupLoading(true);
    try {
      const a = await api.assets.get(value);
      setPreviewAsset(a);
      setStep("custodian");
    } catch (e) {
      if (e instanceof ApiError && e.code === "unknown_asset") {
        setLookupError(`Tag "${value}" not found.`);
      } else {
        setLookupError("Couldn't look up asset. Check your connection.");
      }
    } finally {
      setLookupLoading(false);
    }
  }

  function handleBadgeScan(value: string) {
    setToCustodian(value);
    setShowBadgeCamera(false);
    setStep("confirm");
  }

  async function handleTransfer() {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/scans/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_tag: tag,
          to_custodian: toCustodian.trim(),
          user_id: fromUser,
          scan_payload: toCustodian.trim(),
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
    setStep("asset");
    setTag("");
    setPreviewAsset(null);
    setToCustodian("");
    setAsset(null);
    setError(null);
    setLookupError(null);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a href="/tech" className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <h1 className="text-xl font-semibold">Transfer custody</h1>
      </div>

      {/* Step indicator */}
      {(step === "asset" || step === "custodian" || step === "confirm") && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <StepDot n={1} active={step === "asset"} done={step !== "asset"} label="Asset" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepDot n={2} active={step === "custodian"} done={step === "confirm"} label="Recipient" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepDot n={3} active={step === "confirm"} done={false} label="Confirm" />
        </div>
      )}

      {step === "asset" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You are <span className="font-medium">{fromUser}</span>. Scan the asset you are handing off.
          </p>
          {lookupLoading ? (
            <div className="flex items-center gap-3 py-6"><Spinner /><span className="text-sm text-gray-500">Looking up asset…</span></div>
          ) : (
            <ScanInput onScan={handleTagScan} placeholder="Asset tag" label="Asset tag" />
          )}
          {lookupError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{lookupError}</div>
          )}
          <button type="button" onClick={() => setShowAssetCamera(true)} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
            <CameraIcon /> Use camera to scan
          </button>
          {showAssetCamera && (
            <BarcodeScanner
              onScan={(v) => { setShowAssetCamera(false); handleTagScan(v); }}
              onClose={() => setShowAssetCamera(false)}
            />
          )}
        </div>
      )}

      {step === "custodian" && previewAsset && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-2">
            <p className="text-sm text-gray-500">Asset to transfer</p>
            <p className="font-mono font-semibold text-gray-900">{previewAsset.asset_tag}</p>
            <p className="text-sm text-gray-600">{previewAsset.manufacturer} {previewAsset.model}</p>
            <p className="text-xs text-gray-400">Current custodian: {previewAsset.custodian}</p>
          </div>

          <p className="text-sm text-gray-600">Scan the recipient's badge or type their user ID.</p>
          <ScanInput
            onScan={(v) => { setToCustodian(v); setStep("confirm"); }}
            placeholder="Recipient badge / user ID"
            label="Recipient badge"
          />
          <button type="button" onClick={() => setShowBadgeCamera(true)} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
            <CameraIcon /> Scan badge with camera
          </button>
          {showBadgeCamera && (
            <BarcodeScanner
              onScan={handleBadgeScan}
              onClose={() => setShowBadgeCamera(false)}
            />
          )}
          <button type="button" onClick={() => setStep("asset")} className="text-sm text-gray-400 hover:text-gray-600">
            ← Re-scan asset
          </button>
        </div>
      )}

      {step === "confirm" && previewAsset && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white border border-gray-200 p-5 space-y-4">
            <p className="text-sm font-medium text-gray-700">Confirm transfer</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">Asset</span>
                <span className="font-mono font-semibold">{tag}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-500">From</span>
                <span className="font-medium">{fromUser}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">To</span>
                <span className="font-medium text-blue-700">{toCustodian}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">Asset state doesn't change. Only the custodian record updates.</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep("custodian")}>
              Change recipient
            </Button>
            <Button className="flex-1" size="lg" onClick={handleTransfer}>
              Confirm transfer
            </Button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Recording transfer…</p>
        </div>
      )}

      {step === "success" && asset && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <span className="text-green-600 text-xl" aria-hidden="true">✓</span>
            <div>
              <p className="font-medium text-green-900">Custody transferred</p>
              <p className="text-sm text-green-700">Now with {asset.custodian}.</p>
            </div>
          </div>
          <AssetCard asset={asset} />
          <Button variant="secondary" size="lg" className="w-full" onClick={reset}>
            Transfer another
          </Button>
        </div>
      )}

      {step === "error" && (
        <div className="space-y-4">
          <ErrorBanner error={error} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={reset}>Start over</Button>
            <Button className="flex-1" onClick={() => { setStep("confirm"); setError(null); }}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${active ? "bg-blue-600 text-white" : done ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
        {done ? "✓" : n}
      </div>
      <span className={active ? "text-gray-900 font-medium" : "text-gray-400"}>{label}</span>
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
