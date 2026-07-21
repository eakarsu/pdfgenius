# Prototype operations

There is no production runbook, deployment, release, SLO, on-call, backup, restore,
or disaster-recovery commitment for this repository.

## Approved commands

```sh
npm ci --ignore-scripts
npm run check:boundary
npm test
npm run build
bash scripts/security-audit.sh
```

`npm run build` demonstrates only that the frontend bundles. It does not validate
PostgreSQL, Redis, storage, ClamAV, LibreOffice, Poppler, OCR, LLM providers,
workers, migrations, retention, or deletion propagation.

## Local evaluation gate

Local runtime is discouraged. If an assigned reviewer must evaluate it, use a
disposable network-isolated environment, synthetic PDFs, a disposable database,
an explicitly reviewed disposable account/permission policy, and a local
ClamAV-family scanner. Account email addresses must use the reserved `.invalid`
domain; signup and account mutation are intentionally unavailable. Copy
`.env.example` to an ignored local file, provide unique disposable values, and set:

```text
PDFGENIUS_PROTOTYPE_ACK=I_UNDERSTAND_PDFGENIUS_IS_LOCAL_ONLY
```

The server refuses `NODE_ENV=production`, missing `DATABASE_URL`, JWT secrets
shorter than 32 characters, non-loopback PostgreSQL/storage endpoints, and absent,
wildcard, or non-loopback CORS origins. PDF upload also
fails closed without `clamscan` or `clamdscan`, and the HTTP listener is fixed to
`127.0.0.1`. Do not bypass these gates.

`start.sh`, Docker, Genezio, and Nginx deployment artifacts are intentionally
non-runnable. `start-local.sh` performs no process killing, dependency install,
database creation, schema synchronization, or seeding; npm pre-hooks still apply
the runtime gate.

## Database and data lifecycle

Schema alteration and seeding commands are blocked and the legacy seed
implementation was removed. No migration chain exists,
so do not create or modify a persistent database from this repository. The
narrowed upload path deletes staging files, records content provenance, validates
content again on download, omits storage paths from client responses, and performs
storage deletion before database deletion. Missing storage objects block record
deletion for reconciliation. Bulk deletion is disabled because cross-resource
atomicity/reconciliation is not implemented.

No retention, legal hold, backup, deletion audit, versioning, redaction, or export
policy is complete. Therefore only disposable synthetic data is permitted.

## Exit from quarantine

Create a new repository and assign product, technical, security, privacy, legal,
and operations owners. Define one user journey and its data classification,
external contracts, acceptance criteria, retention/deletion semantics, migration
and rollback, failure recovery, deterministic evaluation, abuse cases, tests,
monitoring, release provenance, and decommission plan. Do not lift this boundary
by changing a flag in place.
