'use strict';

const ACKNOWLEDGEMENT = 'I_UNDERSTAND_PDFGENIUS_IS_LOCAL_ONLY';
const MIN_SECRET_LENGTH = 32;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

class PrototypeBoundaryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PrototypeBoundaryError';
    this.code = 'PROTOTYPE_BOUNDARY';
  }
}

function assertLocalPrototypeRuntime(env = process.env) {
  if (env.NODE_ENV === 'production') {
    throw new PrototypeBoundaryError(
      'Production runtime is disabled: pdfgenius is an unsupported local prototype.',
    );
  }

  if (env.PDFGENIUS_PROTOTYPE_ACK !== ACKNOWLEDGEMENT) {
    throw new PrototypeBoundaryError(
      'Set PDFGENIUS_PROTOTYPE_ACK to the documented acknowledgement before isolated local use.',
    );
  }

  if (!env.DATABASE_URL) {
    throw new PrototypeBoundaryError('DATABASE_URL is required; database credential fallbacks are disabled.');
  }
  try {
    const databaseUrl = new URL(env.DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
        !LOOPBACK_HOSTS.has(databaseUrl.hostname)) {
      throw new Error('not a loopback PostgreSQL URL');
    }
  } catch (error) {
    throw new PrototypeBoundaryError('DATABASE_URL must target PostgreSQL on a loopback host.');
  }

  if (!env.JWT_SECRET || env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    throw new PrototypeBoundaryError(`JWT_SECRET must contain at least ${MIN_SECRET_LENGTH} characters.`);
  }

  const origins = (env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    throw new PrototypeBoundaryError('CORS_ORIGINS must be an explicit, non-wildcard loopback origin list.');
  }
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) ||
          !LOOPBACK_HOSTS.has(parsed.hostname) || parsed.origin !== origin) {
        throw new Error('not a loopback origin');
      }
    } catch (error) {
      throw new PrototypeBoundaryError('CORS_ORIGINS must contain only complete loopback origins.');
    }
  }

  return {
    mode: 'local-prototype',
    origins,
  };
}

module.exports = {
  ACKNOWLEDGEMENT,
  LOOPBACK_HOSTS,
  MIN_SECRET_LENGTH,
  PrototypeBoundaryError,
  assertLocalPrototypeRuntime,
};
