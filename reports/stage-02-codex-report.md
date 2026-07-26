# Stage 02 — team administration

Date: 2026-07-26

## Implemented

- Owner-only participant list with email, role and membership status.
- Atomic role change, disable and restore command.
- Last active owner protection under a transaction advisory lock.
- Append-only audit events for every membership change.
- Invitations now remain `invited` until acceptance.
- Repeat invitation and one-click link copy.
- The Team navigation item is rendered only for an active owner; direct route
  authorization remains server-side.

## Verification

- Typecheck and lint passed.
- Unit: 239/239.
- Integration: 119/119.
- Security: 164/164, including new tenant/owner/last-owner/audit/grant checks.
- Next.js and OpenNext Cloudflare builds passed.

## Foundation check

- Membership commands require an authenticated active owner in the same tenant.
- Last-owner invariant is serialized and cannot be bypassed by concurrent calls.
- Audit insertion and membership mutation share one transaction.
- No customer documents, money logic or product modules were changed.
- Migration adds one function and grants only; it does not rewrite data.

## Known schema drift

The TypeScript role union contains `operations`, while the original membership
table constraint does not. Stage 02 does not alter that constraint silently, so
the role is intentionally omitted from the Team form pending a separately
approved compatible migration.

Staging database application, deployment, invite-flow verification and owner
visual acceptance remain pending.
