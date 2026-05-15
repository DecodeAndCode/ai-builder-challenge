import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api-client";
import type { ReceiveScanInput } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const input = (await req.json()) as ReceiveScanInput;
    const asset = await api.scans.receive(input);
    return NextResponse.json(asset, { status: 201 });
  } catch (e: unknown) {
    const err = e as { status?: number; code?: string; message?: string; details?: unknown };
    return NextResponse.json(
      { error: { code: err.code ?? "unknown_error", message: err.message ?? "Unknown error", details: err.details } },
      { status: err.status ?? 500 },
    );
  }
}
