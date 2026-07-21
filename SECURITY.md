# Security policy

## Supported versions

None. This repository is an unsupported local prototype and must not be deployed,
exposed to untrusted networks, or used with real data.

## Confirmed blockers

- The initial lockfile audit reported 78 vulnerabilities: 3 critical, 35 high,
  26 moderate, and 14 low. Removing unused CRA/PDF viewer/demo dependencies and
  applying compatible lockfile updates reduced the reviewed baseline to 4: 0
  critical, 1 high, 3 moderate, and 0 low. Every remaining known vulnerability
  still blocks production; the baseline is a no-regression control, not a waiver.
- Redacted Gitleaks inspection found five findings in reachable history: three
  `.env.docker` findings, one former database fallback, and one historical
  documentation authorization-header example. Current values and any external
  credentials derived from them must be rotated before history remediation.
- The ignored local `.env` is not tracked. Its values were not copied or changed
  during this implementation. Treat them as compromised if they were ever used
  outside a disposable local environment.
- Generated/demo endpoints, query-string bearer tokens, secret fallbacks,
  queue administration/workers, and fail-open RBAC were removed or disabled.
  The runnable frontend also no longer loads a public asset CDN, fake identity
  providers, public legal templates, or search-engine/hosting metadata. Local
  accounts are restricted to the reserved `.invalid` domain, and document API
  responses omit internal storage paths. JWT lifetime is fixed to one hour, but
  logout still has no server-side token revocation and remains a launch blocker.
  This is not evidence that the remaining application has completed a
  security review.

## Reporting

Do not publish secrets, tokens, document contents, personal data, exploit details,
or historical leak material in an issue. Use the repository administrator's
private security channel. No named security owner is established; if no private
channel exists, stop handling the material and escalate through the organization
that controls the repository.

## Required remediation before any product extraction

Rotate potentially exposed credentials, decide whether to rewrite history,
eliminate every unaccepted dependency advisory, establish repository licensing,
threat-model authentication/storage/processing/deletion, add migrations and
rollback, define and test the permission-policy source, and complete independent
application and infrastructure reviews. Any
product extraction must occur in a separately owned repository.
