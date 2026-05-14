const axios = require('axios');
const { extractAIError } = require('../utils/ai-helpers');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_EMBED_URL = 'https://openrouter.ai/api/v1/embeddings';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
const DEFAULT_EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small';

async function chat({ model, messages, maxTokens = 4000, temperature = 0.3 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: model || DEFAULT_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.PUBLIC_BASE_URL || 'https://pdfgenius.com',
          'X-Title': 'PDFGenius',
        },
        timeout: 120000,
      },
    );

    return {
      content: response.data?.choices?.[0]?.message?.content || '',
      usage: response.data?.usage || null,
      model: response.data?.model || model || DEFAULT_MODEL,
    };
  } catch (err) {
    const { message, code } = extractAIError(err);
    const wrapped = new Error(`OpenRouter error${code ? ' [' + code + ']' : ''}: ${message}`);
    wrapped.upstreamCode = code;
    throw wrapped;
  }
}

async function embed(texts) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  try {
    const response = await axios.post(
      OPENROUTER_EMBED_URL,
      {
        model: DEFAULT_EMBED_MODEL,
        input: Array.isArray(texts) ? texts : [texts],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.PUBLIC_BASE_URL || 'https://pdfgenius.com',
          'X-Title': 'PDFGenius',
        },
        timeout: 60000,
      },
    );
    const data = response.data?.data || [];
    return data.map((d) => d.embedding);
  } catch (err) {
    const { message } = extractAIError(err);
    throw new Error(`OpenRouter embeddings error: ${message}`);
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

module.exports = { chat, embed, cosineSimilarity, DEFAULT_MODEL };
