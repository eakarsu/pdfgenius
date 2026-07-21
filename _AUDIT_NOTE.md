# Audit Note - pdfgenius

> Superseded by `PROJECT_STATUS.json` on 2026-07-20. The generated gap/demo
> routes and pages described below were removed from the retained executable
> boundary because they did not implement durable product behavior.

Source: `_AUDIT/reports/batch_11.md` (lines 305-339).

## Original Audit Recommendations

### Missing AI Counterparts
- OCR/document extraction pipeline. (already present via `extraction.routes.js`)
- Form-filling assistant. (`autofill.routes.js`)
- Template-based document generation. (`templates.routes.js`)

### Missing Non-AI Features
- Collaboration/commenting on PDFs.
- Versioning/revision history.
- Watermarking or DRM.
- Batch processing workflows.

### Custom Feature Suggestions
1. Form Extraction & Auto-Fill Agent.
2. Document Classification.
3. Compliance Check Agent.
4. Multi-language RAG.
5. White-Label SaaS Mode.
6. Streaming PDF Generation.

## Implementations Applied

Added 2 endpoints to `src/routes/ai.routes.js` matching the existing pattern (auth + RBAC, `callOpenRouterAPI`, `ProcessingJob` persistence):
- `POST /api/ai/classify/:documentId` — categorize document, output structured JSON, persist as `job_type: 'classify'`.
- `POST /api/ai/compliance-check/:documentId` — scan against GDPR/HIPAA/PCI-DSS (configurable `frameworks` array), persist as `job_type: 'compliance_check'`.

Both reuse existing helpers, RBAC tags, and `ProcessingJob` model. No new dependencies.

## Backlog (Prioritized)

### High
- Versioning/revision history on documents.
- Collaboration/commenting on PDFs.
- Batch processing workflow runner.

### Medium
- Watermarking / DRM.
- Multi-language RAG.
- Streaming PDF generation with progress.

### Low / Product Decisions
- White-label SaaS reseller portal.
- Template marketplace.

## Apply pass 3 (frontend)
- **Action:** LEFT-AS-IS. FE already fully wired for both pass-2 endpoints.
- `src/pages/AIClassify/index.js` is a unified UI with a mode toggle (`classify` / `compliance-check`) and posts to either `/api/ai/classify/${docId}` or `/api/ai/compliance-check/${docId}`, sending the JWT Bearer token from localStorage.
- Route registered in `src/App.js` at `/ai-classify` and linked from the Navbar.
- No frontend changes required this pass.

## Apply pass 4 (mechanical backlog)
- **Action:** IMPLEMENTED (2 mechanical features — FE wiring of existing BE endpoints).
- BE was already extended with `/api/ai/translate/:documentId` (line 719) and `/api/ai/redaction-suggestions/:documentId` (line 784), each guarded by `requireAIKey` (returns 503 with `error: 'AI service not configured'` when `OPENROUTER_API_KEY` is unset). No new BE work required.
- FE: extended `src/pages/AIClassify/index.js`:
  1. **Translate Document** — adds `translate` mode with target-language dropdown (10 languages already declared in `TARGET_LANGUAGES`) and optional source-language input. POSTs `{ targetLanguage, sourceLanguage? }` to `/api/ai/translate/${docId}` using `authFetch` (JWT Bearer from `AuthContext`). Renders `result.translation.translation` in a `<pre>` block.
  2. **Redaction Suggestions** — adds `redaction` mode with category checkboxes (PII / PHI / PCI / Credentials / TradeSecrets, already declared in `REDACTION_CATEGORIES`). POSTs `{ categories }` to `/api/ai/redaction-suggestions/${docId}`. Renders `result.suggestions[]` as a list with category, severity, snippet, replacement.
- Submit handler now branches on `mode` (`classify` / `compliance` / `translate` / `redaction`) and surfaces the BE 503 explicitly: `if (response.status === 503) throw new Error(...)`, which the existing `toast.error` + `setError` flow displays inline.
- Existing styling (`AIAnalysis/index.css`), existing `useAuth().authFetch` JWT injection, existing toast pattern reused — no new deps.
- **Backlog deferred:** Versioning/revision history, collaboration/comments, batch processing, watermarking/DRM (NEEDS-PRODUCT-DECISION + non-LLM); white-label SaaS, template marketplace (NEEDS-PRODUCT-DECISION); streaming PDF generation (TOO-RISKY: SSE wiring rewrite).
- **Smoke test:** PASS — `node --check src/routes/ai.routes.js` OK; `@babel/parser` parse of `src/pages/AIClassify/index.js` OK. Live HTTP skipped (server requires PostgreSQL/MongoDB and document upload pipeline).
