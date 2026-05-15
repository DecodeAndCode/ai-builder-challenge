import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api-client";
import type { StoreScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = (await req.json()) as StoreScanInput;

    // Check if asset is currently in_service so we know to clear facilities
    let wasInService = false;
    try {
      const existing = await api.assets.get(input.asset_tag);
      wasInService = existing.state === "in_service";
    } catch {
      // unknown_asset will surface in the scan itself
    }

    const asset = await api.scans.store(input);

    // Clear facilities record when de-racking an in-service asset
    if (wasInService) {
      try {
        await api.mock.updateFacilities({ tagged_id: asset.asset_tag, rack_location: null });
      } catch {
        // Write-back failure is non-fatal; reconcile will surface drift
      }
    }

    return NextResponse.json(asset);
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string; message?: string; details?: unknown };
    return NextResponse.json(
      { error: { code: err.code ?? "unknown_error", message: err.message ?? "Unknown error", details: err.details } },
      { status: err.status ?? 500 },
    );
  }
}
