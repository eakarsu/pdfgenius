const { DocumentChunk, Document, RagChat, RagMessage } = require('../models');
const { chat, embed, cosineSimilarity } = require('./openrouter.service');

/**
 * Multi-document RAG chat using stored chunk embeddings.
 * Retrieves top-k chunks across the user's selected document set,
 * grounds the LLM with citations [page=N, doc=ID], and persists the
 * exchange in RagChat / RagMessage.
 */
async function ask(chatId, userId, question, { topK = 6, model } = {}) {
  let chatRow = await RagChat.findByPk(chatId);
  if (!chatRow || chatRow.user_id !== userId) throw new Error('Chat not found');

  // 1) Embed the question
  const [qEmb] = await embed([question]);

  // 2) Pull all chunks from the chat's documents
  const chunks = await DocumentChunk.findAll({
    where: { document_id: chatRow.document_ids },
  });
  if (chunks.length === 0) {
    throw new Error('No indexed chunks. Run /api/rag/index first.');
  }

  // 3) Score by cosine similarity
  const scored = chunks
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length)
    .map((c) => ({ chunk: c, score: cosineSimilarity(qEmb, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (scored.length === 0) {
    throw new Error('No usable embeddings. Run /api/rag/index for these documents.');
  }

  const context = scored
    .map(
      (s, i) =>
        `[#${i + 1} doc=${s.chunk.document_id} pages=${s.chunk.page_start}-${s.chunk.page_end} score=${s.score.toFixed(2)}]\n${s.chunk.text.slice(0, 1500)}`,
    )
    .join('\n\n---\n\n');

  // 4) Persist the user message
  await RagMessage.create({ chat_id: chatRow.id, role: 'user', content: question });

  // 5) Ask
  const aiRes = await chat({
    model,
    messages: [
      {
        role: 'system',
        content: `You answer questions ONLY using the provided document context. Always cite sources as [doc:DOC_ID page:N]. If the context does not contain the answer, say "I could not find this in the provided documents."`,
      },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    maxTokens: 1200,
    temperature: 0.2,
  });

  const citations = scored.map((s) => ({
    documentId: s.chunk.document_id,
    pageStart: s.chunk.page_start,
    pageEnd: s.chunk.page_end,
    score: s.score,
  }));

  await RagMessage.create({
    chat_id: chatRow.id,
    role: 'assistant',
    content: aiRes.content,
    citations,
    model: aiRes.model,
    tokens_in: aiRes.usage?.prompt_tokens || null,
    tokens_out: aiRes.usage?.completion_tokens || null,
  });

  return { answer: aiRes.content, citations, model: aiRes.model };
}

module.exports = { ask };
