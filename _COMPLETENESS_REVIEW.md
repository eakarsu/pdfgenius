# Completeness Review: pdfgenius

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 196 project files (129 source files), 1 manifest(s), 1 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished document/PDF processing application, not just an empty scaffold. Inspection found 129 source files across `src/`, `.vscode/` using Next.js, React, Express; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- Only 1 test-like file(s) were found, too little evidence for the breadth of the implemented workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Add durable upload, malware/type validation, OCR/conversion jobs, object storage, retries, and lifecycle cleanup.
2. Preserve page-level provenance, version history, redaction boundaries, metadata, and deterministic output validation.
3. Implement tenant isolation, signed access, retention/legal hold, export, and deletion propagation.
4. Test encrypted, malformed, oversized, multilingual, scanned, and partially processed documents.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.

## Evidence inspected

- `README.md`
- `src/routes/documents.routes.js:446`
- `src/App.js:47`
- `server.js`
- `src/App.test.js`
- `package.json`

## Recommended next action

Choose one real document/PDF processing journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress

**Implemented 2026-07-20 — retained as an unsupported local prototype.** A
production-viable journey could not be established safely from repository
evidence, so the review was implemented through the permitted safest-boundary
path. `PROJECT_STATUS.json` records `retain-local-prototype-quarantine`, disables
deployment and real data, leaves ownership and distribution authorization
explicitly unassigned, and lists every residual launch blocker.

- Runtime now fails closed before database/service initialization: production is
  refused before third-party application modules load, an exact local-only
  acknowledgement is required, database and 32+
  character JWT values have no fallback, and CORS must name explicit origins.
  HTTP, PostgreSQL, CORS, and optional S3-compatible storage endpoints are
  restricted to loopback hosts.
  RBAC denies absent/erroring policy data, queue administration and workers are
  outside the mounted boundary, query-string bearer tokens were removed, and
  generated gap/demo backend and frontend routes were removed. Active routes now
  load only their individual User, Permission, and Document models rather than
  initializing the unsupported aggregate model graph.
- The retained evaluation path is authenticated PDF upload/list/download/delete.
  Login input is limited to reserved `.invalid` synthetic email addresses and
  bounded passwords; account creation/profile/password mutation are disabled and
  require an external reviewed fixture. API response allowlists do not disclose
  storage paths.
  It requires matching PDF MIME/extension, PDF header/trailer inspection,
  rejection of encryption, JavaScript/actions and embedded files, a clean
  `clamscan`/`clamdscan` result, SHA-256 provenance, owner-scoped access, integrity
  verification before download, and storage deletion before database deletion.
  AI/OCR processing, bulk status/provenance mutation, and bulk deletion fail
  closed because their contracts and reconciliation are incomplete.
- Destructive start, schema-sync, seed, Docker, Genezio, and Nginx paths were
  disabled, and the legacy destructive seed implementation was removed. The
  retained server binds only to loopback and no longer initializes generic
  cleanup/logging utilities. `README.md`, `SECURITY.md`,
  `OPERATIONS.md`, and `.env.example` define the quarantine, safe static checks,
  data restrictions, extraction gate, and external infrastructure contracts.
  Fake pricing/trial/extraction marketing, signup/identity-provider controls, public
  legal templates, search-engine verification, PWA metadata, CDN assets, and
  hosting redirects were removed from the runnable frontend.
- Unused CRA, PDF viewer/worker, API-demo, and stale test dependencies/assets were
  removed; npm is the single lockfile authority. Compatible lockfile remediation
  reduced `npm audit` from 78 findings (3 critical, 35 high, 26 moderate, 14 low)
  to 4 (0 critical, 1 high, 3 moderate, 0 low). CI enforces that no-regression
  ceiling, but it is not a production risk acceptance. The locked graph now has
  418 dependencies and the active frontend bundle no longer includes the retired
  PDF-export/CRA/marketing dependency graph.
- Node's deterministic test runner now covers runtime rejection, destructive
  command rejection, boundary verification, synthetic identity/password policy,
  PDF content/provenance validation, unsafe/encrypted/malformed cases, and
  malware-scan fail-closed behavior.
  `.github/workflows/prototype-boundary.yml` runs locked installation without
  lifecycle scripts, boundary checks, tests, frontend build, dependency audit,
  and candidate/post-boundary secret scans, with no deploy job.

Residual blockers are intentional and launch-blocking: five redacted Gitleaks
findings remain in reachable pre-boundary history; ignored local environment
values require rotation if ever used; four dependency advisories remain; there is
no reviewed migration/rollback chain, account/permission-policy fixture, malware scanner,
or integration environment; JWT logout has no server-side revocation; and version
history, page/redaction provenance, OCR/multilingual/scanned evaluation, retention,
legal hold, export/deletion reconciliation, queue recovery, repository-wide
licensing, and assigned product/security/operations ownership remain unresolved.
Any real product must be extracted into a separately owned and reviewed boundary.

## Runtime acceptance verification (2026-07-20)

The quarantine remains intact: `start.sh` still refuses non-test execution, requires the exact local-only acknowledgement, and accepts only loopback infrastructure. For the shared non-suite validator only, explicit `migrate` and `create-admin` commands now prepare a minimal disposable PostgreSQL fixture after checking `NODE_ENV=test`, `ALLOW_DISPOSABLE_SEED=YES`, and the loopback database host. The acceptance identity is a reserved synthetic `.invalid` address; it does not relax the product authentication boundary.

The first isolated attempt exposed a bootstrap-only acknowledgement leaking into the launcher contract, and the second exposed validator discovery of the reserved fixture identity. Both were corrected without enabling production use. The final run on isolated loopback ports (`55680` database, `6164` API, `6165` browser origin) launched `start.sh`, authenticated through `/api/auth/login`, and verified the session through `/api/auth/me`, recording `API_VERIFIED startup_login_session_api`.

Final static verification also passed the quarantine boundary check, all 29 deterministic tests, both fixture-script syntax checks, `start.sh` syntax validation, and the Vite production build. All assigned ports were released after the runtime check.
