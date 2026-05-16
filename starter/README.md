# Asset tracking — submission README

Built by Chiranjeev Kumar for the Cerebras AI Engineering Intern (Manufacturing) challenge.

**Live demo:** https://ai-builder-challenge.vercel.app
**API:** https://cerebras-asset-api.fly.dev
**Repo:** https://github.com/DecodeAndCode/ai-builder-challenge

## What I built

A Next.js 15 frontend over the pre-built Fastify/SQLite asset-tracking API. Four scan workflows for lab technicians (keyboard scanner + phone camera), a manager dashboard with pagination and filtering over ~1,000 assets, and a three-way reconciliation report that categorizes discrepancies between operations, facilities, and finance.

## Quick start

```bash
# From the monorepo root
pnpm install
cp starter/.env.example starter/.env
pnpm dev
# API on :8080, frontend on :3000
```

Environment variables (both server-side only — never `NEXT_PUBLIC_*`):
- `API_BASE_URL` — `http://localhost:8080/v1` for local dev
- `API_TOKEN` — `local-dev-token-1234567890` for local dev (set in `.env.example`)

## Routes built

| Path | Purpose |
|---|---|
| `/tech` | Scan workflow landing — pick a workflow |
| `/tech/receive` | Receive a new or returning asset |
| `/tech/store` | Store an asset; clears facilities record if from `in_service` |
| `/tech/deploy` | Deploy to a rack; writes facilities + finance on success |
| `/tech/transfer` | Two-sided custody handoff (asset → recipient badge) |
| `/manager` | Asset list — pagination, state/site/custodian filters |
| `/manager/assets/[tag]` | Asset detail + full event log (newest first) |
| `/manager/reconcile` | Three-way reconciliation report |
| `/dev/barcodes` | Printable Code 128 barcodes for demo assets, locations, badges |
| `/api/scans/[type]` | Server-side scan orchestration + write-backs |
| `/api/reconcile` | Server-side join of ops + facilities + finance |
| `/api/upstream/*` | Same-origin proxy — attaches bearer token server-side |

## Three calls I nearly made the other way

**1. Show asset state before confirming a scan (vs. scan-and-commit immediately)**

On store and deploy pages I fetch the asset after scanning the tag and show its current state before the tech commits. The alternative — commit on tag scan — is how warehouse handheld scanners usually work. I kept the preview because the challenge brief explicitly calls out "a tech catching 'this isn't where it's supposed to be'" — that can only happen if there's a moment to see current state. Losing 2 seconds to a preview is worth it for a 40lb instrument in the wrong rack.

**2. Reconcile page calls API client directly (vs. fetching `/api/reconcile`)**

The page at `/manager/reconcile` calls `api.assets.list()`, `api.mock.facilities()`, and `api.mock.finance()` directly as a React Server Component, then passes the result to `buildReconcileReport()`. The route handler at `/api/reconcile` still exists (required by the brief) but the page bypasses it to skip an HTTP round-trip from RSC to the same server. The route handler is useful for caching layers or external consumers. The page uses the logic directly.

**3. Transfer: step-by-step (vs. two ScanInputs on one screen)**

Transfer has three explicit steps: scan asset → scan recipient badge → confirmation screen. The alternative was two `<ScanInput>` components on one screen, auto-advancing on the second scan. I went with steps because: (1) the confirmation screen shows "from / to" clearly before committing — both parties are visible at once; (2) a gloved tech scanning twice on the same screen is more likely to scan the same field twice; (3) the brief calls it a "two-sided custody handoff" — making both sides visible before confirming matches that intent.

## Write-path architecture

Write-backs (facilities + finance) happen in the server-side route handlers at `/api/scans/[type]/route.ts`, not in the browser. Three reasons: the API token must stay server-side; co-locating scan + write-back in one handler makes failure reasoning clear; the browser calling facilities/finance directly would require `NEXT_PUBLIC_API_TOKEN`, which the starter explicitly warns against.

`deploy` → POST to facilities (set rack location) and finance (status: capitalized).
`store` from `in_service` → POST to facilities with `rack_location: null` (de-rack). Finance untouched.
`receive`, `store` from `received`, `transfer` → no write-backs.

Write-backs use `Promise.allSettled` — a failed write doesn't roll back the scan. The scan is the operational source of truth. Write-back failures surface in the next reconciliation run.

## Flagged inconsistencies in the brief

- The brief says "scan the receiving party's badge" for transfer, but the API's `to_custodian` field takes a user ID string (like `tech-mike`), not a badge ID. These are the same thing in this system — I treat the scanned badge value as the user ID. Worth noting: in a real deployment, badge IDs and system user IDs might differ.
- `POST /v1/mock/facilities/spaces` documentation shows the request body as `{ tagged_id, rack_location | null }`, but the surrounding text says "set rack_location to null to remove the row." Tested both — sending `null` does clear the record. No issue, just ambiguous docs.
- The `api-reference.md` lists `POST /v1/scans/receive` as returning `201` for new assets and `200` for idempotent duplicates, but the HTTP 201 vs 200 distinction is not surfaced in the `ApiClient` wrapper. I use status code from the response directly in the server route handlers.

## What I chose not to build

- **Camera auto-detect**: I added an explicit "Use camera" button rather than auto-detecting device type (screen width, `navigator.maxTouchPoints` etc.). Auto-detect is fragile on tablets and hybrid devices. An explicit button is glove-friendly and never wrong.
- **Optimistic UI on scans**: Scan pages wait for the server before showing success. Optimistic updates would risk showing success for a serial mismatch — a confusing state for a tech holding the actual asset.
- **Error retry with backoff**: "Try again" button exists; automatic retry doesn't. Retrying a duplicate receive with a different serial isn't a transient error — it's a data problem that needs human resolution.
- **Bulk operations, RMA UI, offline sync**: explicitly out of scope per the brief.

## Scripts

```bash
pnpm dev          # dev server (runs from monorepo root for both api + starter)
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (10 tests)
pnpm lint         # next lint
```

## Reset before Loom

```bash
curl -X POST http://localhost:8080/v1/reset \
  -H "Authorization: Bearer local-dev-token-1234567890"
```

Then print barcodes from `/dev/barcodes` for the demo.
