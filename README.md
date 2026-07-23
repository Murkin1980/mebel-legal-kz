# MebelLegal KZ

**The legal workspace for Kazakhstan’s furniture industry**

MebelLegal KZ is a specialized legal operations platform for furniture manufacturers, custom furniture businesses, legal reviewers, and contract managers in the Republic of Kazakhstan.

The project was submitted to the **OpenAI Day competition on Product Hunt**. It demonstrates how a narrowly focused, safety-first legal workspace can help furniture businesses manage contracts, approvals, order changes, claims, execution checkpoints, and legal evidence without turning AI into an unsupervised decision-maker.

> MebelLegal KZ supports legal preparation and operational control. It does not replace a qualified lawyer, guarantee that a document is legally valid, or predict the outcome of a dispute.

## Live Demo

**[Open the MebelLegal KZ demo](https://mebel-legal-kz.muriktl.workers.dev/login)**

Synthetic competition account:

```text
Email: test@mebel-legal-kz.test
Password: Test123456!
```

The demo contains synthetic data only. It does not contain real contracts, company details, customer records, or personal data.

---

## Why MebelLegal KZ exists

Furniture contracts are more complex than standard product sales.

A single order may include custom measurements, drawings, materials, hardware, installation terms, staged payments, approval of sketches, production changes, delivery milestones, and warranty obligations. When these details are scattered across chats, files, spreadsheets, and verbal agreements, both the manufacturer and the customer face avoidable legal risk.

Common problems include:

- generic contracts that do not reflect custom furniture workflows;
- uncertainty about which contract, specification, or drawing was approved;
- unrecorded changes to materials, dimensions, price, or deadlines;
- weak evidence of customer decisions and approvals;
- missed contractual checkpoints and closing documents;
- outdated wording and templates;
- fragmented handling of claims and disputes;
- no reliable audit trail of legally significant actions.

MebelLegal KZ turns this fragmented process into a structured and traceable legal workflow.

---

## What the platform does

MebelLegal KZ creates a controlled legal layer around a furniture order:

```text
Order source
→ Legal case
→ Data validation
→ Rule-based checks
→ Versioned contract package
→ Human review
→ Customer approval
→ Contract execution
→ Immutable history
→ Approved data transfer
```

The platform is designed to help teams:

- create and manage a legal case for each furniture order;
- maintain versioned contracts, specifications, and related documents;
- connect legal conclusions to approved sources and deterministic rules;
- record who approved a specific document version and when;
- manage order changes and their legal consequences;
- register and process claims;
- track contract phases, checkpoints, checklists, and payment summaries;
- preserve a tamper-resistant audit history;
- isolate every organization’s data in a multi-tenant environment;
- transfer approved data to adjacent systems through versioned contracts.

---

## Current implementation

The current platform includes:

### Multi-tenant organizations and access control

- organizations and memberships;
- role-based server-side authorization;
- Row Level Security for tenant-owned data;
- deny-by-default access policies;
- isolation tests against cross-organization access;
- dedicated roles for owners, managers, designers, legal reviewers, observers, and operations users.

### Legal cases

- structured legal case records;
- controlled case state transitions;
- domain-level validation;
- optimistic concurrency protection;
- idempotent commands;
- links to external order identifiers without copying ownership of external domains.

### Legal sources and deterministic rules

- registry of legal sources and revisions;
- version-aware legal rules;
- controlled publication workflow;
- traceability between a rule and its supporting source;
- human approval before legally significant content is published.

### Versioned templates and contract packages

- versioned document templates;
- controlled template statuses;
- contract package versions;
- immutable published versions;
- content hashes and replacement chains;
- separation between drafts, reviewed versions, published versions, and retired versions.

### Approvals and customer decisions

- approval workflows;
- recording of decisions against a specific version;
- revocation and replacement through new events rather than history rewriting;
- traceable evidence of who made a decision and when.

### Order changes and claims

- structured change-order handling;
- history of requested and approved changes;
- claim registration and lifecycle management;
- links between claims, legal cases, documents, and audit events.

### Contract execution

- execution phases with controlled state transitions;
- execution checkpoints;
- create, complete, and reopen operations with validation;
- operational checklists;
- payment summaries using integer money calculations;
- execution overview for active contract work.

### Audit and reliability

- append-only audit log;
- transaction-based domain commands;
- idempotency keys for repeat-safe operations;
- optimistic concurrency for conflict protection;
- standardized errors and validation;
- automated unit, integration, end-to-end, and security testing;
- real-database security tests for RLS and tenant isolation.

### Cloud deployment

- Next.js deployment through OpenNext for Cloudflare;
- Cloudflare Workers build and deployment scripts;
- separate deployment validation workflow;
- synthetic public demo environment;
- no real customer data in the competition demo.

---

## AI approach

MebelLegal KZ is designed as an AI-assisted system, not an autonomous lawyer.

The long-term AI layer is intended to support:

- structured extraction from contracts and attachments;
- document classification;
- comparison of contract and template versions;
- retrieval from an approved legal knowledge corpus;
- explanation of deterministic check results;
- identification of missing information and known risk patterns;
- preparation of drafts for human review.

The project follows strict AI boundaries:

- AI does not independently publish legal rules or templates;
- AI output is treated as a proposal until a user confirms it;
- financial calculations, deadlines, permissions, and state transitions remain deterministic;
- every important conclusion should be traceable to approved data or a source;
- low-confidence or conflicting results must be escalated to a human;
- the system must clearly distinguish facts, rules, assumptions, and generated suggestions.

This approach makes AI useful while preserving accountability.

---

## Designed specifically for Kazakhstan

MebelLegal KZ is not a generic global contract generator with translated labels.

The platform is being built around:

- the legal and business environment of the Republic of Kazakhstan;
- contracts used by individual entrepreneurs and limited liability partnerships;
- prices and payment calculations in KZT;
- monetary storage in integer tiyn values rather than floating-point numbers;
- Russian-language operational workflows, with Kazakh localization planned;
- controlled use of official legal sources;
- the real workflow of custom furniture manufacturing and installation.

Official legal-source integration must remain versioned, reviewable, and human-controlled. An unavailable or changed source must never be silently replaced by an unsupported AI answer.

---

## Product boundaries

MebelLegal KZ is part of a broader furniture-business software ecosystem, with strict ownership boundaries.

| System | Owns |
|---|---|
| **MebelLegal KZ** | Legal sources, legal rules, templates, legal cases, contract packages, approvals, order changes, claims, execution workflow, and legal audit history |
| **Interactive KP** | Commercial proposals, product options, configuration choices, and pre-contract commercial calculations |
| **MebelDocs AI** | Invoices, payments, accounting documents, closing documents, electronic invoices, and bank reconciliation |

One system must never access another system’s tables directly. Integration is allowed only through authenticated, authorized, versioned, and idempotent API contracts.

---

## Architecture

MebelLegal KZ uses a modular-monolith architecture.

```text
Next.js application
├── Identity and authentication
├── Organizations and memberships
├── Legal cases
├── Legal sources and rules
├── Templates and contract packages
├── Approvals
├── Change orders
├── Claims
├── Contract execution
├── Audit
└── Shared domain types
```

Core architectural principles:

1. **Tenant isolation** — organization-owned data is protected by server authorization and PostgreSQL RLS.
2. **Domain commands** — legally significant changes pass through validated commands.
3. **Append-only audit** — history is corrected with new events, never overwritten.
4. **Versioning** — published or approved legal objects become immutable versions.
5. **Idempotency** — a repeated request must not create duplicate legal actions.
6. **Optimistic concurrency** — stale updates are rejected instead of silently overwriting current data.
7. **Deterministic money** — KZT amounts are stored as integer tiyn values using `bigint`.
8. **Human authority** — AI cannot bypass permissions, publication gates, or legal review.

---

## Technology stack

| Layer | Technology |
|---|---|
| Application | Next.js 16, App Router |
| UI | React 19, Tailwind CSS |
| Language | TypeScript in strict mode |
| Backend | Next.js Server Actions and route handlers |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | PostgreSQL Row Level Security |
| Validation | Zod |
| Unit and integration testing | Vitest |
| End-to-end testing | Playwright |
| Cloud deployment | OpenNext and Cloudflare Workers |
| Tooling | ESLint, Wrangler |

---

## Repository structure

```text
src/
├── app/                      # Next.js routes and application UI
├── modules/                  # Domain modules
│   ├── identity/
│   ├── organizations/
│   ├── cases/
│   ├── legal-sources/
│   ├── rules/
│   ├── templates/
│   ├── documents/
│   ├── approvals/
│   ├── change-orders/
│   ├── claims/
│   ├── execution/
│   ├── audit/
│   └── shared/
├── lib/                      # Infrastructure and shared adapters
supabase/
└── migrations/               # Database migrations and RLS policies
tests/
├── unit/
├── integration/
├── security/
└── e2e/
docs/
└── deployment/               # Deployment and operating documentation
```

The exact directory set may evolve, but domain ownership and security boundaries are governed by `FOUNDATION.md`.

---

## Local development

```bash
git clone https://github.com/Murkin1980/mebel-legal-kz.git
cd mebel-legal-kz
npm install
cp .env.example .env.local
```

Add the required Supabase environment variables to `.env.local`, apply the repository migrations to an isolated development database, and start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Do not use a production database as a development or test environment.

---

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run test:security
npm run test:security:realdb
npm run test:e2e
npm run build
npm run preflight
```

Cloudflare commands:

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Security tests and migrations must be run against an isolated environment. Never place service-role credentials in browser code or public build variables.

---

## Documentation

| Document | Purpose |
|---|---|
| [FOUNDATION.md](./FOUNDATION.md) | Mandatory product and architecture contract |
| [PRODUCT.md](./PRODUCT.md) | Product definition and target users |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture and domain boundaries |
| [COMPLIANCE.md](./COMPLIANCE.md) | Legal and compliance constraints |
| [SECURITY.md](./SECURITY.md) | Security model and required controls |
| [ROADMAP.md](./ROADMAP.md) | Delivery stages and acceptance gates |
| [CHECKLISTS.md](./CHECKLISTS.md) | Stage and release checklists |
| [AI_INFRA_DECISION.md](./AI_INFRA_DECISION.md) | Rules governing AI use |
| [SESSION_NOTES.md](./SESSION_NOTES.md) | Implementation and validation history |

`FOUNDATION.md` has priority over informal implementation instructions. Any change that conflicts with it must be explicitly reviewed before development continues.

---

## OpenAI Day and Product Hunt

MebelLegal KZ was submitted to the OpenAI Day competition through Product Hunt as a vertical AI product for a real, underserved industry.

The project’s core thesis is that high-value AI products do not need to be generic assistants. A focused system can combine:

- deep industry workflow knowledge;
- local legal context;
- deterministic business rules;
- secure organizational data isolation;
- traceable AI assistance;
- mandatory human approval.

The competition demo focuses on the legal workflow and technical foundation already implemented, while clearly separating current functionality from future AI capabilities.

---

## Roadmap

The next product priorities include:

- synchronizing all project documentation with the implemented stages;
- expanding the approved legal-source corpus;
- strengthening deterministic contract checks;
- improving contract-package generation and review workflows;
- adding controlled customer-facing approval links;
- expanding execution, claims, and change-order workflows;
- introducing source-grounded AI assistance behind human approval gates;
- integrating with Interactive KP and MebelDocs AI through versioned APIs;
- completing Russian and Kazakh localization;
- preparing pilot and production compliance reviews.

---

## License

This is a proprietary project. All rights reserved.
