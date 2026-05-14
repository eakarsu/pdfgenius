const { Document, DocumentChunk } = require('../models');
const { chat, embed } = require('./openrouter.service');
const { parseAIJson } = require('../utils/ai-helpers');

const TARGET_CHARS_PER_CHUNK = 6000;
const OVERLAP_CHARS = 400;

function chunkText(text, targetSize = TARGET_CHARS_PER_CHUNK, overlap = OVERLAP_CHARS) {
  const chunks = [];
  if (!text) return chunks;
  const paragraphs = text.split(/\n\s*\n/);
  let buffer = '';
  for (const p of paragraphs) {
    if ((buffer + '\n\n' + p).length > targetSize && buffer) {
      chunks.push(buffer.trim());
      buffer = buffer.slice(Math.max(0, buffer.length - overlap)) + '\n\n' + p;
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}

/**
 * Build chunks with citations for a document.
 * Each chunk is summarized in parallel, embeddings are computed, and the
 * final synthesis returns a structured object the UI can render with
 * page-anchor citations.
 */
async function chunkAndSummarize(documentId, { model, citations = true } = {}) {
  const doc = await Document.findOne({
    where: { id: documentId },
    include: ['pages'],
  });
  if (!doc) throw new Error('Document not found');

  // Build a per-page text array preserving page numbers for citation anchors
  const pages = (doc.pages || []).sort((a, b) => a.page_number - b.page_number);
  const concatenated = pages.map((p) => `\n[[PAGE:${p.page_number}]]\n${p.extracted_text || ''}`).join('\n');

  const chunks = chunkText(concatenated);
  await DocumentChunk.destroy({ where: { document_id: doc.id } });

  const chunkSummaries = [];
  let chunkIndex = 0;
  for (const chunk of chunks) {
    // Identify pages covered by this chunk
    const pageMatches = [...chunk.matchAll(/\[\[PAGE:(\d+)\]\]/g)].map((m) => parseInt(m[1], 10));
    const pageStart = pageMatches.length ? Math.min(...pageMatches) : null;
    const pageEnd = pageMatches.length ? Math.max(...pageMatches) : null;

    const summaryRes = await chat({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You summarize document chunks. Return JSON: {"summary": "3-5 sentences", "keyFacts": ["..."], "pageReferences": [1,2]}',
        },
        { role: 'user', content: chunk },
      ],
      maxTokens: 800,
      temperature: 0.2,
    });
    const parsed = parseAIJson(summaryRes.content) || {
      summary: summaryRes.content.slice(0, 800),
      keyFacts: [],
      pageReferences: pageMatches,
    };

    const chunkRow = await DocumentChunk.create({
      document_id: doc.id,
      chunk_index: chunkIndex,
      page_start: pageStart,
      page_end: pageEnd,
      text: chunk,
      summary: parsed.summary,
      citations: citations ? (parsed.pageReferences || pageMatches).map((p) => ({ page: p })) : [],
      tokens: summaryRes.usage?.completion_tokens || null,
    });
    chunkSummaries.push({ chunkId: chunkRow.id, ...parsed, pageStart, pageEnd });
    chunkIndex++;
  }

  // Final synthesis pass
  const synthesisInput = chunkSummaries
    .map((c, i) => `Chunk ${i + 1} (pp. ${c.pageStart}-${c.pageEnd}): ${c.summary}`)
    .join('\n\n');

  const finalRes = await chat({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You produce a final document summary from per-chunk summaries. Return JSON: {"executiveSummary": "...", "sections": [{"title": "...", "summary": "...", "pageReferences": [1,2]}], "actionItems": ["..."], "keyFigures": ["..."]}',
      },
      { role: 'user', content: synthesisInput },
    ],
    maxTokens: 2000,
    temperature: 0.3,
  });
  const finalSummary = parseAIJson(finalRes.content) || { executiveSummary: finalRes.content };

  return {
    documentId: doc.id,
    chunks: chunkSummaries,
    finalSummary,
    model: finalRes.model,
  };
}

/**
 * Compute embeddings for all chunks of a document (used by RAG chat
 * and form autofill). Run lazily after chunkAndSummarize.
 */
async function indexChunks(documentId) {
  const chunks = await DocumentChunk.findAll({
    where: { document_id: documentId },
    order: [['chunk_index', 'ASC']],
  });
  if (chunks.length === 0) return { indexed: 0 };
  const embeddings = await embed(chunks.map((c) => c.text.slice(0, 8000)));
  for (let i = 0; i < chunks.length; i++) {
    await chunks[i].update({ embedding: embeddings[i] });
  }
  return { indexed: chunks.length };
}

module.exports = { chunkAndSummarize, indexChunks, chunkText };
