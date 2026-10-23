'use strict';
// Wave 1B: owner-scoped document review tasks (process-local, no schema
// change), CSV/JSON serializers, deterministic document AI fallbacks.
const crypto = require('node:crypto');
const TASK_STATUSES = new Set(['open', 'in_progress', 'done']);
function err(message) { const e = new Error(message); e.status = 400; e.code = 'VALIDATION_ERROR'; return e; }
function createTaskStore() {
  const tasks = new Map();
  return {
    list(ownerId, { status, search } = {}) { let out = [...tasks.values()].filter((t) => t.ownerId === String(ownerId)); if (status) out = out.filter((t) => t.status === status); if (search) { const q = String(search).toLowerCase(); out = out.filter((t) => t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)); } return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); },
    create(ownerId, input = {}) { const title = String(input.title || '').trim(); if (!title || title.length > 200) throw err('title must be 1-200 characters'); const status = input.status || 'open'; if (!TASK_STATUSES.has(status)) throw err('status is invalid'); const task = { id: crypto.randomUUID(), ownerId: String(ownerId), title, notes: input.notes ? String(input.notes).slice(0, 2000) : '', documentId: input.documentId || null, status, dueDate: input.dueDate || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; tasks.set(task.id, task); return task; },
    update(ownerId, id, patch = {}) { const task = tasks.get(String(id)); if (!task || task.ownerId !== String(ownerId)) return null; if (patch.title !== undefined) { const t = String(patch.title).trim(); if (!t || t.length > 200) throw err('title must be 1-200 characters'); task.title = t; } if (patch.notes !== undefined) task.notes = String(patch.notes).slice(0, 2000); if (patch.status !== undefined) { if (!TASK_STATUSES.has(patch.status)) throw err('status is invalid'); task.status = patch.status; } if (patch.dueDate !== undefined) task.dueDate = patch.dueDate || null; task.updatedAt = new Date().toISOString(); return task; },
  };
}
function csvCell(v) { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function toCsv(records, columns) { return [columns.map((c) => csvCell(c.label)).join(','), ...records.map((r) => columns.map((c) => csvCell(typeof c.accessor === 'function' ? c.accessor(r) : r[c.accessor])).join(','))].join('\n'); }
const DOCUMENT_COLUMNS = [{ label: 'Name', accessor: 'original_name' }, { label: 'Status', accessor: 'status' }, { label: 'Pages', accessor: 'total_pages' }, { label: 'Size', accessor: 'file_size' }, { label: 'Created', accessor: 'created_at' }];
function fallbackLabel() { return { provider: 'deterministic-fallback', aiGenerated: false, label: 'Deterministic fallback — no AI provider configured. Computed locally from your document text; not AI-generated.' }; }
function documentText(pages = []) { return pages.map((p) => p.extracted_text || '').join('\n').trim(); }
function documentSummary(document = {}, pages = []) {
  const text = documentText(pages); const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return { ...fallbackLabel(), feature: 'document-summary', sections: { summary: sentences.slice(0, 3).join(' ') || 'No extracted text available for this document yet.', metrics: { pages: document.total_pages ?? pages.length, characters: text.length, status: document.status ?? 'unknown', hasExtractedText: text.length > 0 }, findings: sentences.slice(0, 5), recommendations: text.length ? ['Review the opening sentences, then verify key figures in the full text.'] : ['Process the document to extract text before summarizing.'] } };
}
function documentQa(document = {}, pages = [], question = '') {
  const text = documentText(pages); const terms = String(question).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const hits = sentences.filter((s) => terms.some((t) => s.toLowerCase().includes(t))).slice(0, 3);
  return { ...fallbackLabel(), feature: 'document-qa', sections: { summary: hits.length ? hits.join(' ') : 'No sentence in the extracted text matches the question terms.', metrics: { matchedSentences: hits.length, characters: text.length, questionProvided: Boolean(String(question).trim()) }, findings: hits, recommendations: hits.length ? ['Open the matching pages to verify the answer in context.'] : ['Rephrase with key terms from the document or process the document first.'] } };
}
function documentKeyFields(document = {}, pages = []) {
  const text = documentText(pages);
  const uniq = (re) => [...new Set((text.match(re) || []).map((s) => s.trim()))].slice(0, 10);
  const emails = uniq(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  const amounts = uniq(/\$[\d,]+(?:\.\d{2})?/g);
  const dates = uniq(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g);
  return { ...fallbackLabel(), feature: 'document-key-fields', sections: { summary: `Extracted ${emails.length} email(s), ${amounts.length} amount(s) and ${dates.length} date(s) from ${document.original_name || 'this document'}.`, metrics: { emails: emails.length, amounts: amounts.length, dates: dates.length, hasContactEmail: emails.length > 0 }, findings: [...emails.map((e) => `Email: ${e}`), ...amounts.map((a) => `Amount: ${a}`), ...dates.map((d) => `Date: ${d}`)], recommendations: (emails.length || amounts.length || dates.length) ? ['Verify extracted values against the source pages before use.'] : ['No emails, amounts or ISO/US dates found — process the document or check the extraction.'] } };
}
module.exports = { createTaskStore, toCsv, DOCUMENT_COLUMNS, documentSummary, documentQa, documentKeyFields };
