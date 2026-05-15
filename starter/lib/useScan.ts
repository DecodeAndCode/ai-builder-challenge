"use client";

import { useState } from "react";
import type { Asset } from "./types";
import { ApiError } from "./api-client";

type ScanState = "idle" | "loading" | "success" | "error";

export function useScan<TInput>(
  endpoint: string,
): {
  state: ScanState;
  asset: Asset | null;
  error: Error | null;
  submit: (input: TInput) => Promise<Asset | null>;
  reset: () => void;
} {
  const [state, setState] = useState<ScanState>("idle");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<Error | null>(null);

  async function submit(input: TInput): Promise<Asset | null> {
    setState("loading");
    setError(null);
    setAsset(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        const e = new ApiError(
          res.status,
          json.error?.code ?? "unknown_error",
          json.error?.message ?? `HTTP ${res.status}`,
          json.error?.details,
        );
        throw e;
      }
      setAsset(json as Asset);
      setState("success");
      return json as Asset;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setState("error");
      return null;
    }
  }

  function reset() {
    setState("idle");
    setAsset(null);
    setError(null);
  }

  return { state, asset, error, submit, reset };
}
