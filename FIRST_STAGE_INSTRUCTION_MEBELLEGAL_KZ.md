# MBL-MB0 — verified MiniBase migration foundation

Status: approved by owner on 2026-08-20.

## Outcome

Prepare a complete, reversible migration from the existing Supabase demo to a
dedicated MiniBase project without weakening tenant isolation, authorization,
domain transactions, idempotency, versioning, or append-only audit.

## Scope

1. Inventory every Supabase Auth, RLS, RPC, table, function, and application SDK dependency.
2. Define the target D1 schema and server-only domain command boundary.
3. Define a safe Auth handoff. Supabase password hashes, sessions, refresh tokens,
   JWT secrets, service-role keys, and database credentials must never be copied.
4. Produce a versioned export manifest, UTF-8 NDJSON, SHA-256 checksums,
   deterministic PostgreSQL-to-SQLite transformations, verification, and rollback evidence.
5. Use the Supabase demo only as a read-only migration source. Do not delete or mutate it.

## Mandatory gates

- Every query and command derives `organization_id` from the authenticated server principal.
- Every domain write is transactional, idempotent, role-checked, and appends an audit event.
- Money remains integer tiyin and never crosses JavaScript as `number`.
- Cross-tenant tests cover forged organization, entity, URL, and command identifiers.
- Cutover requires matching counts/checksums, successful Auth handoff, verified rollback artifacts,
  and all project checks passing.

## Excluded from MBL-MB0

- Production cutover, DNS changes, or Supabase mutation/deletion.
- Real credentials or personal/legal data in Git or fixtures.
- Paid features, UI redesign, or unrelated domain refactoring.

