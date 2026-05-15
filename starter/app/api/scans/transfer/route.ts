import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api-client";
import type { TransferScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = (await req.json()) as TransferScanInput;
    const asset = await api.scans.transfer(input);
    return NextResponse.json(asset);
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string; message?: string; details?: unknown };
    return NextResponse.json(
      { error: { code: err.code ?? "unknown_error", message: err.message ?? "Unknown error", details: err.details } },
      { status: err.status ?? 500 },
    );
  }
}
