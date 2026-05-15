import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api-client";
import type { DeployScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = (await req.json()) as DeployScanInput;
    const asset = await api.scans.deploy(input);

    const rackLocation = [
      asset.location.rack,
      asset.location.ru ? `RU${asset.location.ru}` : null,
    ]
      .filter(Boolean)
      .join("-");

    // Write-backs run in parallel; failures are non-fatal
    await Promise.allSettled([
      api.mock.updateFacilities({
        tagged_id: asset.asset_tag,
        rack_location: rackLocation || null,
      }),
      api.mock.updateFinance({
        tag: asset.asset_tag,
        site: asset.location.site,
        status: "capitalized",
        capitalized_on: new Date().toISOString(),
      }),
    ]);

    return NextResponse.json(asset);
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string; message?: string; details?: unknown };
    return NextResponse.json(
      { error: { code: err.code ?? "unknown_error", message: err.message ?? "Unknown error", details: err.details } },
      { status: err.status ?? 500 },
    );
  }
}
