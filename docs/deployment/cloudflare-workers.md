# Cloudflare Workers Deployment — MebelLegal KZ

## Deployment Target

**OpenNext on Cloudflare Workers** (via `@opennextjs/cloudflare` adapter).

- Supports Next.js 16 with Node.js runtime (full feature compatibility)
- Supabase SSR auth with cookies works out of the box
- Server Actions, App Router, all dynamic routes supported
- `@cloudflare/next-on-pages` is deprecated — OpenNext is the recommended path

**Staging URL**: `https://mebel-legal-kz.muriktl.workers.dev`

## Prerequisites

- Node.js >= 22
- Cloudflare account (free tier sufficient for internal)
- Supabase project `uctedpswcbcwufzegvhl` (already provisioned)
- GitHub repo `Murkin1980/mebel-legal-kz`

## Files Added/Changed

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Cloudflare Worker config — name, compat flags, assets, R2 cache, images binding |
| `open-next.config.ts` | OpenNext build config — R2 incremental cache |
| `public/_headers` | Static asset caching headers (`/_next/static/*` → immutable) |
| `eslint.config.mjs` | Added `.open-next/**` to globalIgnores (build output) |
| `package.json` | Added `@opennextjs/cloudflare`, `wrangler`, `cf:build/preview/deploy` scripts |

## Commands

```bash
# Local preview (builds + runs in workerd)
npm run preview

# Build for Cloudflare (produces .open-next/worker.js)
npm run cf:build

# Run every local quality gate, including real-DB security tests
npm run preflight

# Deploy to Cloudflare Workers
npm run cf:deploy
```

> Do not publish a Windows-built OpenNext bundle. Local Windows `next build`
> remains supported for development checks, but the deployable OpenNext bundle
> must be produced by Cloudflare Workers Builds, WSL, or another Linux runner.

`npm run test:security` is safe for public pull requests and does not require
credentials. `npm run test:security:realdb` requires the three Supabase
variables listed below and runs on pushes to `main` when repository secrets are
available.

## R2 Incremental Cache

R2 bucket `mebel-legal-cache` is configured in `wrangler.jsonc` and `open-next.config.ts` for OpenNext's incremental cache.

**Currently optional**: the project does not use ISR (Incremental Static Regeneration). All routes are server-rendered on demand (`ƒ`). R2 is configured for future use and does not harm the current setup.

If you want to skip R2 for now, remove the `r2_buckets` section from `wrangler.jsonc` and the `r2IncrementalCache` import from `open-next.config.ts`.

## Environment Variables

| Variable | Public/Server | Required | Source | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** | Yes | Supabase Dashboard → Settings → API | Inlined at build time, safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public** | Yes | Supabase Dashboard → Settings → API | Inlined at build time, safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Yes | Supabase Dashboard → Settings → API | Set via `wrangler secret put` or Cloudflare dashboard. NEVER in `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_APP_ENV` | **Public** | Yes | Manual | Set to `staging` for internal deployment |

### How to set env vars on Cloudflare

```bash
# Server-only secrets (never exposed to browser)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste the service role key when prompted

# Public vars — set in Cloudflare dashboard under Workers & Pages → Settings → Variables
# Or add to wrangler.jsonc [vars] section for preview
```

## Supabase Auth Settings

In Supabase Dashboard → Authentication → URL Configuration:

| Setting | Value |
|---|---|
| Site URL | `https://mebel-legal-kz.<your-subdomain>.workers.dev` |
| Redirect URLs | `https://mebel-legal-kz.<your-subdomain>.workers.dev/*` |

**Do NOT change auth flow.** The existing `@supabase/ssr` cookie-based auth works with OpenNext's Node.js runtime.

## Cloudflare Dashboard Steps

### 1. Create R2 Bucket (for incremental cache)

Workers & Pages → R2 → Create bucket → Name: `mebel-legal-cache`

### 2. Connect GitHub Repo

Workers & Pages → Create application → Pages → Connect to Git

| Setting | Value |
|---|---|
| Repository | `Murkin1980/mebel-legal-kz` |
| Production branch | `main` |
| Framework preset | Next.js (opennextjs) |
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy command | `npx wrangler versions upload` |
| Node.js version | `22` |

### 3. Set Environment Variables

Workers & Pages → mebel-legal-kz → Settings → Variables & Secrets

Add:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://uctedpswcbcwufzegvhl.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<anon key from .env.local>`
- `NEXT_PUBLIC_APP_ENV` = `staging`
- `SUPABASE_SERVICE_ROLE_KEY` = `<service role key>` (encrypt as secret)

### 4. Set Compatibility Flags

Workers & Pages → Settings → Functions → Compatibility Flags:
- Add: `nodejs_compat`
- Compatibility date: `2024-09-23`

### 5. Deploy

Push to `main` branch → Cloudflare auto-deploys → staging URL appears in deployment log.

Staging URL format: `https://mebel-legal-kz.<hash>.workers.dev`

### 6. Update Supabase Redirect URLs

After first deploy, copy the staging URL and add it to Supabase → Authentication → URL Configuration → Redirect URLs.

## Post-Deploy Smoke Validation

After deployment, verify manually:

1. `/login` — renders login page
2. Login with test credentials → redirects to `/app`
3. `/app/cases` — cases list loads
4. `/app/legal/sources` — legal sources list
5. `/app/legal/rules` — rules list
6. `/app/templates` — templates list
7. `/app/approvals` — approvals list
8. `/app/cases/[id]/changes` — change orders (after creating a case)
9. `/app/cases/[id]/claims` — claims (after creating a case)
10. No client-side errors in browser console
11. No `SUPABASE_SERVICE_ROLE_KEY` visible in Network tab or client JS

## Rollback

1. Cloudflare dashboard → Deployments → click previous successful deployment → "Retry deployment"
2. Or: `git revert <commit>` → push → auto-deploys previous version

## Known Limitations

- **Internal-only** — no custom domain, no public access for clients
- **No real data** — synthetic data in tenge only
- **R2 bucket required** — must be created before first deploy (for incremental cache)
- **Windows warning** — a Windows build can complete successfully and still
  fail at runtime. Build deployable bundles on Linux via Cloudflare Workers
  Builds, WSL, or another Linux CI runner.
- **Service role key** — only used server-side in `createServiceClient()`, never exposed to browser
- **Webpack required** — `package.json` uses `next build --webpack` because OpenNext v1.20.1 does not bundle Turbopack SSR chunks correctly on Workers. Turbopack support may arrive in a future OpenNext release.
- **Non-ASCII paths** — all build/deploy commands must run from ASCII-only directories. Cyrillic in paths breaks wrangler, OpenNext, and PowerShell CLI tools.

## Risks

| Risk | Mitigation |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` leaked | Only set as encrypted Cloudflare secret, never in `NEXT_PUBLIC_*` |
| Build fails on Windows | Use WSL or CI pipeline for production builds |
| R2 bucket missing | Create before first deploy |
| Auth redirect mismatch | Update Supabase Site URL after deploy |
| Env var mismatch | Verify all 3 vars set before deploy |
