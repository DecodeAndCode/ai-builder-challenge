import { NextResponse } from "next/server";
import { api } from "@/lib/api-client";
import { buildReconcileReport } from "@/lib/reconcile";

export async function GET(): Promise<NextResponse> {
  try {
    const [assets, facilities, finance] = await Promise.all([
      api.assets.list(),
      api.mock.facilities(),
      api.mock.finance(),
    ]);

    const report = buildReconcileReport(assets, facilities, finance);
    return NextResponse.json(report);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: { code: "reconcile_failed", message: msg } },
      { status: 500 },
    );
  }
}
