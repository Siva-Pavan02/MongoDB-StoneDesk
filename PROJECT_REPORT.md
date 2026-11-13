# StoneDesk Project Report

Date: 6 November 2026 (Asia/Calcutta)

## Scope and status

This report describes the local project, the MongoDB migration cleanup completed in this conversation, and the checks actually performed. It is based on source files and local command results. It does not certify production readiness, migrated data completeness, database performance, or deployed infrastructure. No live database writes or deployment changes were made.

StoneDesk currently uses MongoDB through Mongoose. The frontend production build and the tested frontend and database-free backend suites passed. Database integration and concurrency behavior still need verification before treating the migration as fully validated.

## Product overview

StoneDesk supports granite quarry dispatch and billing workflows through a mobile-oriented web application. Its main capabilities include:

- Organization setup, business branding, product rates, and saved truck/destination references.
- Password login, cookie sessions, team invitations, account management, and password recovery.
- Admin, Manager (stored as `YardManager`), and Dispatcher roles.
- Load measurement entry, server-calculated totals, draft recovery, dispatch finalization, and delivery status updates.
- Loading requirement lists, invoice payments, balances, and dashboard analytics.
- Printable A4 invoices, PDF/Excel exports, and driver-facing documents.

These capabilities are represented in the code; a complete live end-to-end acceptance run was not performed for this report.

## Architecture

| Layer | Implementation | Main location |
| --- | --- | --- |
| Browser client | React 19, Vite 8, Tailwind CSS 4, daisyUI 5 | `Frontend/src/` |
| API | Express 5 on Node.js 22+ | `Backend/app.js`, `Backend/routes/`, `Backend/controllers/` |
| Persistence | MongoDB with Mongoose schemas | `Backend/models/` |
| Database connection | Shared connection lifecycle and environment loading | `Backend/utils/db.js` |
| Data access | Mongoose-backed compatibility adapter | `Backend/utils/prisma.js` |
| Authentication | Application-managed passwords and sessions | `Backend/utils/auth.js`, `Backend/routes/authRoutes.js` |
| Logo storage | Local filesystem, configurable with `UPLOAD_DIR` | `Backend/utils/logoStorage.js` |
| Rate limiting | Upstash Redis; local-only in-memory fallback | `Backend/utils/rateLimiter.js` |
| Email | Nodemailer/SMTP | `Backend/utils/email.js` |
| Unified startup | API and built frontend in one process | `server.js` |
| Mock environment | JSON-file-backed API on port 5001 | `Backend/mock/server.js` |

The browser calls `/api/auth`, `/api/master-settings/:quarryId`, `/api/dispatches`, and `/api/loading-lists`. Workspace routes require a session and active user. Organization-owned queries use `organizationId` to enforce tenant scope in application code.

The adapter filename `prisma.js` is retained because it is actively imported throughout the backend. Its implementation uses Mongoose; the installed application manifests do not declare the Prisma client.

## MongoDB data model

| Model | Responsibility |
| --- | --- |
| `MasterSettings` | Organization profile, rates, branding, saved references, settings version |
| `User` | Organization membership, role, account status, password credentials |
| `Session` | Hashed session tokens and expiry |
| `Invitation` | Team invitation lifecycle |
| `PasswordResetToken` | Password recovery token lifecycle |
| `Dispatch` | Load logistics, inventory, summary, business snapshot, revisions, status |
| `LoadingList` | Loading requirements and progress |
| `InvoicePayment` | Payment amount, dispatch reference, organization, author |
| `AuditLog` | Application audit events |

The inspected schemas use string UUID identifiers. Dispatch data embeds logistics, inventory, summaries, and historical business snapshots; payments and users are separate referenced documents. Schemas declare indexes for tenant filters, identifiers, list access patterns, and session expiry. These declarations were inspected locally; actual deployed indexes were not inspected.

## Migration cleanup completed

- Rewrote the root README to document MongoDB setup, dependency installation, environment precedence, development proxy configuration, unified hosting, and test limitations.
- Corrected stale PostgreSQL wording in mock comments and the business workflow diagram.
- Removed the unused `$queryRaw` no-op from the database adapter after checking callers.
- Removed the redundant `Prisma` wrapper around the mock's local `Decimal` class, preserving its calculations.
- Updated backend contributor instructions to describe the Mongoose adapter and current test configuration.
- Corrected deployment documentation for server ports, production rate limiting, dependency installation, and persistent logo storage.
- Marked the earlier database efficiency review as historical and removed an obsolete connection-pool observation.

A case-insensitive project search found no references to the former hosted database provider after cleanup, excluding dependency directories and Git internals. This is a source-level result, not proof of data migration completeness or removal of external resources.

## Configuration and operation

Install dependencies from the project root:

```sh
npm --prefix Backend ci
npm --prefix Frontend ci
```

Use `.env.example` as the configuration starting point. `DATABASE_URL` accepts a local MongoDB URI or an Atlas URI. Root `.env` is loaded before `Backend/.env`; the backend connection loader uses overriding values, so check both files when diagnosing configuration.

| Mode | Commands | Port behavior |
| --- | --- | --- |
| Separate development | `npm --prefix Backend run dev` and `npm --prefix Frontend run dev` | API defaults to 5000; Vite normally uses 5173 |
| Unified server | `npm run build`, then `npm start` | Root server defaults to 3000; example `PORT=5000` overrides it |
| Mock API | `npm --prefix Backend run mock` | Defaults to 5001; configure Vite's `API_PROXY_TARGET` accordingly |
| Connectivity check | `npm --prefix Backend run db:check` | Read-only connection check; not run during this review |

Set `APP_ORIGIN` to the actual browser origin. Production authentication rate limiting requires working Upstash credentials. Password recovery requires SMTP configuration. Logo storage needs a writable, persistent location.

The Vercel configuration file exists locally. Its presence does not establish that deployment is active or correctly provisioned. `/healthz` returns an application response; it does not query MongoDB to prove database readiness.

## Security controls observed

The inspected source includes scrypt password hashing, hashed session tokens, HTTP-only cookies with `SameSite=Strict`, secure cookies in production, origin checks, role middleware, authenticated logo routes, request body limits, and security response headers. API responses use `Cache-Control: no-store`.

These are observed controls, not the result of a comprehensive security audit. Tenant isolation and financial correctness still require database-backed verification.

## Verification results

Results below were obtained during the immediately preceding cleanup in this conversation; they were not rerun solely to create this report.

| Check | Result |
| --- | --- |
| Frontend production build | Passed |
| Frontend package test command | 199 tests passed, 0 failed |
| Backend query projection and error handler tests | 4 tests passed, 0 failed |
| Syntax checks for changed adapter and mock files | Passed |
| Search for removed adapter stub and mock wrapper usages | No remaining matches |
| Full backend integration suite | Not run: test isolation is not enforced by the current helper |
| Live MongoDB connectivity, indexes, migration reconciliation | Not verified |
| Multi-process payment concurrency and rollback | Not verified |
| Deployed application smoke test | Not performed |

The frontend package command selects `tests/*.test.js`; these counts do not include every differently named or differently located test file. The four backend tests are a targeted subset, not the complete backend suite.

## Remaining technical concerns

### 1. Transaction behavior needs correction and verification

Source inspection of `Backend/utils/prisma.js` shows that callback transactions start a Mongoose session, but adapter operations do not receive that session. The array form simply uses `Promise.all`. The callback lock is process-local. These paths should not be treated as evidence of atomic multi-document writes or safe concurrency across multiple application instances.

Recommended follow-up: explicitly associate operations with MongoDB transaction sessions and test rollback and concurrent payments against a disposable replica-set database. No transaction implementation changes were made in this report.

### 2. Integration tests do not enforce database isolation

`Backend/tests/database.js` connects using the normal database configuration. Its early return for a non-test URI does not stop the caller's test from continuing. It does not implement the formerly documented `TEST_DATABASE_URL` setup.

Recommended follow-up: make unsafe test configuration fail before connection or writes, then run integration tests against a dedicated disposable database.

### 3. Production indexes require verification

`Backend/utils/db.js` disables automatic index creation in production. Schema declarations alone therefore do not prove that production has the expected unique or TTL indexes. In particular, `Dispatch.clientRequestId` declares a sparse index but does not declare uniqueness, despite older architecture documentation describing a unique idempotency key.

Recommended follow-up: inspect deployed indexes, decide the intended scope of idempotency keys, and test concurrent duplicate submissions before changing indexes. No indexes were created or removed.

### 4. File storage must survive deployment lifecycle changes

Logos are filesystem-backed. The checked-in hosting configuration does not demonstrate persistent upload storage provisioning.

Recommended follow-up: confirm writable persistent storage for the chosen host and verify that historical invoice logos remain available after a restart or deployment.

## Suggested next steps

1. Enforce integration-test isolation.
2. Correct transaction session propagation and verify financial concurrency and rollback.
3. Reconcile migrated data and production indexes with the intended MongoDB model.
4. Confirm persistent logo storage and smoke-test the deployed application.
5. Refresh the remaining architecture document against the current implementation.

## Source references

- [Project README](README.md)
- [Backend application](Backend/app.js)
- [Database connection](Backend/utils/db.js)
- [Mongoose adapter](Backend/utils/prisma.js)
- [Model exports](Backend/models/index.js)
- [Authentication](Backend/utils/auth.js)
- [Test database helper](Backend/tests/database.js)
- [Deployment notes](docs/deployment.md)
- [Architecture document](docs/ARCHITECTURE.md)
- [Historical efficiency review](Backend/QUERY-EFFICIENCY-REVIEW.md)
