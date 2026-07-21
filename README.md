# pdfgenius — unsupported local prototype

> **Do not deploy this repository or use it with real documents, credentials,
> personal data, court records, regulated data, or production services.**

`pdfgenius` is retained for static review and isolated development with synthetic
data. It is not a production application. `PROJECT_STATUS.json` records the
binding `retain-local-prototype-quarantine` decision; no product owner, security-
patch owner, supported release, distribution authorization, or operational
service commitment is assigned.

The original project combined a React/Vite frontend, Express API, PostgreSQL,
Redis/Bull jobs, local or S3-compatible storage, LibreOffice/Poppler conversion,
OCR, and external LLM calls. Static and security inspection found generated mock
features in product routes, fail-open authorization, hard-coded secret fallbacks,
unsafe start/deployment automation, no schema migrations, one stale test, and a
dependency graph with known vulnerabilities. A launchable boundary could not be
established safely.

## What is retained

The only narrowed data path is authenticated PDF upload/list/download/delete for
future isolated evaluation. Uploads are PDF-only, require file-content checks and
a successful ClamAV-family scan, store SHA-256 provenance, enforce owner scoping,
verify integrity before download, reject query-string tokens, and keep the
database record if storage deletion fails. Client responses omit internal storage
paths, and local accounts require reserved `.invalid` synthetic email addresses.
AI/OCR processing and bulk mutation remain disabled because their provenance,
evaluation, migration, and lifecycle contracts are incomplete.

These controls reduce accidental harm; they do not make the application supported
or suitable for real data.

## Safe verification

```sh
npm ci --ignore-scripts
npm run check:boundary
npm test
npm run build
bash scripts/security-audit.sh
```

The security audit scans candidate tracked content and commits after the reviewed
source snapshot. Five earlier Git-history findings remain a rotation/history-
remediation blocker and are documented in `SECURITY.md`.

Direct server execution and npm start/dev/preview commands fail unless the exact
local-prototype acknowledgement and fail-closed configuration contract are
present. Even then, use only a disposable, network-isolated environment and
synthetic PDFs. See `OPERATIONS.md`; do not infer deployment approval from a
successful build.

There is no repository-wide license file. Retention does not establish rights to
use or distribute the source, dependencies, assets, names, or generated content.
