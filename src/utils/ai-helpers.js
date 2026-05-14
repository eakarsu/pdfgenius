/**
 * Shared AI utilities for pdfgenius.
 *
 *  - parseAIJson(text): 3-strategy JSON parser (raw → strip fences → first {..})
 *  - aiRateLimiter(userId, limit): in-memory sliding-window rate limiter (default 20/hr)
 *  - logAIUsage(payload): persists ai_results JSONB row in AIUsageLog
 *  - extractAIError(err): surface real upstream error messages
 */

function parseAIJson(text) {
  if (!text) return null;
  // Strategy 1
  try { return JSON.parse(text); } catch (e) {}
  // Strategy 2: strip code fences
  try {
    const stripped = text.replace(/```(?:json)?\n?/gi, '').replace(/```/g, '').trim();
    return JSON.parse(stripped);
  } catch (e) {}
  // Strategy 3: first {..} window
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

const buckets = new Map();
const DEFAULT_LIMIT = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '20', 10);
const WINDOW_MS = 60 * 60 * 1000;

function aiRateLimiter(userId, limit = DEFAULT_LIMIT) {
  const now = Date.now();
  const bucket = buckets.get(userId) || { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < WINDOW_MS);
  if (bucket.hits.length >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(bucket.hits[0] + WINDOW_MS),
      limit,
    };
  }
  bucket.hits.push(now);
  buckets.set(userId, bucket);
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    resetAt: new Date(now + WINDOW_MS),
    limit,
  };
}

function extractAIError(err) {
  if (!err) return { message: 'Unknown AI error' };
  if (err.response?.data) {
    return {
      message:
        err.response.data.error?.message ||
        err.response.data.message ||
        JSON.stringify(err.response.data).slice(0, 500),
      code: err.response.status,
    };
  }
  if (err.message) return { message: err.message };
  return { message: String(err) };
}

async function logAIUsage(payload) {
  try {
    const { sequelize } = require('../config/database');
    await sequelize.query(
      `INSERT INTO ai_usage_log (id, user_id, feature, model, input, output, error, duration_ms, tokens_in, tokens_out, cost_usd, created_at)
       VALUES (gen_random_uuid(), :userId, :feature, :model, :input::jsonb, :output::jsonb, :error, :durationMs, :tokensIn, :tokensOut, :costUsd, NOW())`,
      {
        replacements: {
          userId: payload.userId || null,
          feature: payload.feature,
          model: payload.model || null,
          input: JSON.stringify(payload.input || null),
          output: JSON.stringify(payload.output || null),
          error: payload.error || null,
          durationMs: payload.durationMs || null,
          tokensIn: payload.tokensIn || null,
          tokensOut: payload.tokensOut || null,
          costUsd: payload.costUsd || null,
        },
      },
    );
  } catch (e) {
    // Table may not exist yet; non-fatal.
  }
}

module.exports = { parseAIJson, aiRateLimiter, extractAIError, logAIUsage };
