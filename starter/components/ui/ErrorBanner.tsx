"use client";

import { ApiError } from "@/lib/api-client";

const CODE_MESSAGES: Record<string, (details?: Record<string, unknown>) => string> = {
  and_match_failed: (d) => {
    const existing = d?.existing_serial as string | undefined;
    return existing
      ? `Serial mismatch. This tag is already registered with serial ${existing}.`
      : "Serial mismatch. Tag is registered with a different serial number.";
  },
  invalid_transition: (d) => {
    const current = d?.current_state as string | undefined;
    return current
      ? `Can't do that now — asset is currently ${current.replace(/_/g, " ")}.`
      : "Invalid state transition. Check the asset's current state.";
  },
  incomplete_deploy_location: () =>
    "Deploy needs a rack and rack unit (RU). Scan the location barcode or enter both fields.",
  unknown_asset: () =>
    "Asset tag not found. Check the tag and try again, or use Receive for a new asset.",
  rate_limited: () =>
    "Too many requests. Wait a moment and try again.",
};

interface ErrorBannerProps {
  error: Error | ApiError | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  let message = error.message;
  if (error instanceof ApiError) {
    const fn = CODE_MESSAGES[error.code];
    message = fn ? fn(error.details) : error.message;
  }

  return (
    <div
      role="alert"
      className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
    >
      <span className="font-medium">Error: </span>
      {message}
    </div>
  );
}
