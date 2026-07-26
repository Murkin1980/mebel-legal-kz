# Stage 03 Codex report — reliable archive import

Date: 2026-07-26
Branch: `codex/complete-mebeldocs-release`

## Outcome

Stage 03 implementation and local QA are complete. Deployment and owner visual
acceptance remain pending so the stage is not marked fully accepted.

## Delivered

- tenant-scoped history of the latest 50 import batches;
- batch detail with imported files and links to created orders;
- downloadable synthetic ZIP/manifest template;
- explicit `processing`, `completed`, and `failed` behavior;
- idempotent completed archive handling and retry of a failed SHA;
- compensating cleanup of archive-created orders, import file rows and Storage
  object after a failed commit;
- tenant-checked private download using a 60-second signed URL;
- append-only audit events for completed and failed imports.

## Architecture note

Supabase Database and Storage do not share one transaction. The implementation
therefore uses a saga-style compensating workflow. A failed batch remains
visible for diagnosis and retry. If compensation itself is interrupted, the
next retry performs strict cleanup before processing.

## Verification

- typecheck: passed;
- ESLint: passed;
- unit: 240/240;
- integration: 119/119;
- security: 168/168;
- Next.js production build: passed;
- OpenNext Cloudflare build: passed (existing third-party duplicate-key warning
  in the document export bundle remains non-blocking);
- focused import E2E: 2/2;
- desktop/mobile screenshots:
  `output/playwright/stage-03/imports-desktop.png`,
  `output/playwright/stage-03/imports-mobile.png`.

GitHub Actions were not used because its quota is exhausted. Cloudflare deploy
was intentionally deferred to a single batched upload due to the slow network.

## Residual risks

- A true cross-service atomic transaction is impossible with the current
  Database + Storage boundary; compensation is observable and retryable.
- Live signed-download and failed-mid-import scenarios still need staging
  smoke verification after deployment.
- The current Cloudflare staging version does not include this stage yet.
