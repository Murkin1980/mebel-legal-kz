# Supabase to MiniBase migration plan

Decision: `REUSE_COMPONENT`. Mebel Legal KZ will use the existing MiniBase
control plane and a dedicated project D1. Supabase remains unchanged as the
rollback source until it expires or the owner later removes it.

## Verified source footprint

- Next.js uses `@supabase/ssr` and `@supabase/supabase-js` for browser, server,
  service-role, and password authentication.
- 30 source files directly operate on tables; 3 source files call RPC.
- SQL history contains 34 RLS-enablement statements, 138 policies, and 9
  PostgreSQL functions across all major domains.
- PostgreSQL-specific behavior includes UUID defaults, `jsonb`, arrays,
  `timestamptz`, `bigint`, `auth.uid()`, PL/pgSQL RPC, and advisory locks.

Counts are an inventory baseline. The real export manifest must come from the
actual source catalog because combined migrations can duplicate definitions.

## Target architecture

```text
browser
  -> Next.js server actions / route handlers
      -> authenticated MiniBase session
      -> organization membership + role check
      -> versioned domain command API
          -> dedicated project D1 transaction
          -> append-only audit event
          -> project-prefixed R2 object when required
```

`mb_publishable_*` remains read-only. `mb_secret_*` exists only in the trusted
Next.js backend. Neither key is an end-user identity. Generic browser writes are forbidden.

## Stages

### MBL-MB0 — contracts and inventory

Approve the Foundation portability amendment, record the dependency map and
target trust boundaries, and keep the Supabase runtime unchanged.

### MBL-MB1 — MiniBase capabilities

Add user sessions, membership/role authorization, and atomic domain commands
with `command_id`, optimistic concurrency, and same-transaction audit. Prove
cross-project and cross-organization isolation.

### MBL-MB2 — schema transformation

Generate a catalog manifest. Map UUID to canonical `TEXT`, boolean to checked
`INTEGER`, JSONB/arrays to validated JSON `TEXT` or child tables, and timestamptz
to UTC ISO `TEXT`. Preserve money as SQLite `INTEGER`, bound from JavaScript as
`bigint` or decimal string. Replace RPC/advisory locks with transactional domain
commands and uniqueness/idempotency constraints.

### MBL-MB3 — Auth handoff

Export only allowlisted identity attributes and stable source IDs. Never export
password hashes, sessions, refresh tokens, OTP material, service keys, JWT
secrets, or database credentials. Use verified password reset or bounded dual-auth.

### MBL-MB4 — demo import and reconciliation

Freeze source writes for final export; create UTF-8 NDJSON with byte size, row
count, and SHA-256; import idempotently through staging; compare counts, primary
keys, domain totals, audit chains, file inventory, and checksums.

### MBL-MB5 — shadow verification and cutover

Run security/integration/domain parity tests; capture a D1 Time Travel bookmark
and checksummed R2 backup manifest; switch only after a signed verification
report. Rollback restores prior app configuration without deleting evidence.

## Stop conditions

Stop on any tenant leak, missing audit, non-idempotent command, money precision
mismatch, checksum/count mismatch, invalid Auth handoff, unverified backup,
failed build/test, or need for an unapproved paid feature.

